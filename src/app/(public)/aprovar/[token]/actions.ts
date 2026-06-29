"use server";

import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClickupSubtask } from "@/lib/clickup";
import { sendReviewSummaryEmail } from "@/lib/email";

function fmtSec(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.risedoc.com.br";

const tokenSchema = z.string().uuid();

async function resolveGroup(token: string) {
  if (!tokenSchema.safeParse(token).success) return null;
  const sb = createSupabaseServiceClient();
  const { data } = await sb
    .from("approval_groups")
    .select("id")
    .eq("public_token", token)
    .maybeSingle();
  return data ? { sb, groupId: data.id } : null;
}

/**
 * Chamado quando o cliente termina de revisar o lote inteiro.
 * Dispara UM e-mail resumo para a agência (best-effort, idempotente).
 */
export async function finalizeReview(input: {
  token: string;
  reviewerId: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!tokenSchema.safeParse(input.token).success)
    return { error: "Link inválido." };
  const sb = createSupabaseServiceClient();

  const { data: group } = await sb
    .from("approval_groups")
    .select(
      "id, name, last_notified_at, projects ( id, name, agency_id, agencies ( name ) )",
    )
    .eq("public_token", input.token)
    .maybeSingle();
  if (!group) return { error: "Link inválido." };

  // Idempotência: evita reenvio se já notificou nos últimos 60s (refresh/duplo clique).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastAt = (group as any).last_notified_at as string | null;
  if (lastAt && Date.now() - new Date(lastAt).getTime() < 60_000) {
    return { ok: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project: any = Array.isArray((group as any).projects)
    ? (group as any).projects[0]
    : (group as any).projects;
  const clientName: string = project?.name ?? "Cliente";
  const agencyId: string | undefined = project?.agency_id;

  // Contagem de status do lote
  const { data: posts } = await sb
    .from("posts")
    .select("status")
    .eq("group_id", group.id)
    .is("deleted_at", null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = (posts ?? []) as any[];
  const approved = all.filter((p) => p.status === "approved").length;
  const changes = all.filter((p) => p.status === "change_requested").length;

  // Nome do revisor
  const { data: reviewer } = await sb
    .from("reviewer_sessions")
    .select("name")
    .eq("id", input.reviewerId)
    .maybeSingle();

  // E-mails dos membros da agência
  const to: string[] = [];
  if (agencyId) {
    const { data: members } = await sb
      .from("agency_members")
      .select("user_id")
      .eq("agency_id", agencyId);
    const ids = new Set((members ?? []).map((m) => m.user_id));
    if (ids.size > 0) {
      const { data: list } = await sb.auth.admin.listUsers();
      for (const u of list?.users ?? []) {
        if (ids.has(u.id) && u.email) to.push(u.email);
      }
    }
  }

  const r = await sendReviewSummaryEmail({
    to,
    reviewerName: reviewer?.name ?? "O cliente",
    clientName,
    groupName: group.name,
    approved,
    changes,
    total: all.length,
    link: `${APP_URL}/projetos/${project?.id ?? ""}`,
  });

  // marca a notificação (ignora erro de coluna ausente)
  await sb
    .from("approval_groups")
    .update({ last_notified_at: new Date().toISOString() })
    .eq("id", group.id);

  return r.ok ? { ok: true } : { error: r.error ?? "Falha no e-mail" };
}

const reviewerSchema = z.object({
  token: z.string(),
  name: z.string().min(1).max(120),
  email: z.string().email().max(180),
});

export async function identifyReviewer(input: {
  token: string;
  name: string;
  email: string;
}): Promise<{ reviewerId: string } | { error: string }> {
  const parsed = reviewerSchema.safeParse(input);
  if (!parsed.success) return { error: "Preencha nome e e-mail válidos." };

  const ctx = await resolveGroup(input.token);
  if (!ctx) return { error: "Este link não está mais ativo." };

  const { data, error } = await ctx.sb
    .from("reviewer_sessions")
    .insert({ group_id: ctx.groupId, name: parsed.data.name, email: parsed.data.email })
    .select("id")
    .single();

  if (error) return { error: "Não foi possível continuar. Tente de novo." };
  return { reviewerId: data.id };
}

const feedbackSchema = z.object({
  token: z.string(),
  reviewerId: z.string().uuid(),
  postId: z.string().uuid(),
  type: z.enum(["approved", "change_request"]),
  categories: z.array(z.string()).default([]),
  slideIndexes: z.array(z.number().int().nonnegative()).default([]),
  videoTimestamps: z.array(z.number().int().nonnegative()).default([]),
  comment: z.string().max(4000).optional(),
});

export async function submitFeedback(
  input: z.input<typeof feedbackSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const f = parsed.data;

  const ctx = await resolveGroup(f.token);
  if (!ctx) return { error: "Este link não está mais ativo." };

  // Garante que o post pertence a este grupo (escopo).
  const { data: post } = await ctx.sb
    .from("posts")
    .select("id, internal_title, clickup_task_id, post_targets ( id )")
    .eq("id", f.postId)
    .eq("group_id", ctx.groupId)
    .maybeSingle();
  if (!post) return { error: "Post inválido." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetId = (Array.isArray((post as any).post_targets)
    ? (post as any).post_targets[0]?.id
    : (post as any).post_targets?.id) ?? null;

  const { error } = await ctx.sb.from("feedbacks").insert({
    post_id: f.postId,
    post_target_id: targetId,
    group_id: ctx.groupId,
    reviewer_session_id: f.reviewerId,
    type: f.type,
    categories: f.categories,
    slide_indexes: f.slideIndexes,
    video_timestamps: f.videoTimestamps,
    comment: f.comment ?? null,
  });
  if (error) return { error: "Não foi possível salvar sua resposta." };

  const newStatus = f.type === "approved" ? "approved" : "change_requested";
  await ctx.sb.from("posts").update({ status: newStatus }).eq("id", f.postId);
  await ctx.sb.from("post_events").insert({
    post_id: f.postId,
    actor_reviewer_id: f.reviewerId,
    event_type: f.type === "approved" ? "approved" : "change_requested",
    resulting_status: newStatus,
    description:
      f.type === "approved"
        ? "Cliente aprovou o post"
        : "Cliente solicitou ajuste",
  });

  // Integração ClickUp: subtarefa no card vinculado (best-effort, não bloqueia)
  if (f.type === "change_request" && post.clickup_task_id) {
    const { data: reviewer } = await ctx.sb
      .from("reviewer_sessions")
      .select("name")
      .eq("id", f.reviewerId)
      .maybeSingle();

    const lines: string[] = [];
    if (f.categories.length) lines.push(`Tipo de ajuste: ${f.categories.join(", ")}`);
    if (f.slideIndexes.length)
      lines.push(
        `📍 Slide(s) do carrossel a ajustar: ${f.slideIndexes.map((i) => i + 1).join(", ")}`,
      );
    if (f.videoTimestamps.length)
      lines.push(`📍 Momento(s) do vídeo: ${f.videoTimestamps.map(fmtSec).join(", ")}`);
    if (f.comment) lines.push(`\nO que o cliente pediu:\n"${f.comment}"`);
    lines.push(`\nRevisor: ${reviewer?.name ?? "—"}`);
    lines.push(`🔗 Ver no app: ${APP_URL}/posts/${f.postId}`);

    const r = await createClickupSubtask(
      post.clickup_task_id,
      `Ajuste solicitado: ${post.internal_title || "post"}`,
      lines.join("\n"),
    );

    // registra no histórico (sucesso ou falha) para rastreabilidade
    await ctx.sb.from("post_events").insert({
      post_id: f.postId,
      actor_reviewer_id: f.reviewerId,
      event_type: r.ok ? "clickup_subtask_created" : "clickup_subtask_failed",
      description: r.ok
        ? "Subtarefa criada no ClickUp"
        : `Falha ao criar subtarefa no ClickUp: ${r.error}`,
    });
  }

  return { ok: true };
}

const carouselSchema = z.object({
  token: z.string(),
  reviewerId: z.string().uuid(),
  postId: z.string().uuid(),
  categories: z.array(z.string()).default([]),
  items: z
    .array(
      z.object({
        slideIndex: z.number().int().nonnegative(),
        comment: z.string().min(1).max(4000),
      }),
    )
    .min(1),
});

export async function submitCarouselFeedback(
  input: z.input<typeof carouselSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = carouselSchema.safeParse(input);
  if (!parsed.success) return { error: "Aponte o ajuste em pelo menos uma imagem." };
  const f = parsed.data;

  const ctx = await resolveGroup(f.token);
  if (!ctx) return { error: "Este link não está mais ativo." };

  const { data: post } = await ctx.sb
    .from("posts")
    .select("id, internal_title, clickup_task_id, post_targets ( id )")
    .eq("id", f.postId)
    .eq("group_id", ctx.groupId)
    .maybeSingle();
  if (!post) return { error: "Post inválido." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetId = (Array.isArray((post as any).post_targets)
    ? (post as any).post_targets[0]?.id
    : (post as any).post_targets?.id) ?? null;

  // um feedback por card anotado
  const rows = f.items.map((it) => ({
    post_id: f.postId,
    post_target_id: targetId,
    group_id: ctx.groupId,
    reviewer_session_id: f.reviewerId,
    type: "change_request" as const,
    categories: f.categories,
    slide_indexes: [it.slideIndex],
    video_timestamps: [] as number[],
    comment: it.comment,
  }));
  const { error } = await ctx.sb.from("feedbacks").insert(rows);
  if (error) return { error: "Não foi possível salvar sua resposta." };

  await ctx.sb.from("posts").update({ status: "change_requested" }).eq("id", f.postId);
  await ctx.sb.from("post_events").insert({
    post_id: f.postId,
    actor_reviewer_id: f.reviewerId,
    event_type: "change_requested",
    resulting_status: "change_requested",
    description: `Cliente solicitou ajuste em ${f.items.length} imagem(ns) do carrossel`,
  });

  // ClickUp: uma subtarefa por card
  if (post.clickup_task_id) {
    const { data: reviewer } = await ctx.sb
      .from("reviewer_sessions")
      .select("name")
      .eq("id", f.reviewerId)
      .maybeSingle();

    let okCount = 0;
    let failCount = 0;
    let lastErr = "";
    for (const it of f.items) {
      const lines: string[] = [];
      if (f.categories.length) lines.push(`Tipo de ajuste: ${f.categories.join(", ")}`);
      lines.push(`📍 Card ${it.slideIndex + 1} do carrossel`);
      lines.push(`\nO que o cliente pediu:\n"${it.comment}"`);
      lines.push(`\nRevisor: ${reviewer?.name ?? "—"}`);
      lines.push(`🔗 Ver no app: ${APP_URL}/posts/${f.postId}`);
      const r = await createClickupSubtask(
        post.clickup_task_id,
        `Ajuste — Card ${it.slideIndex + 1}: ${post.internal_title || "post"}`,
        lines.join("\n"),
      );
      if (r.ok) okCount++;
      else {
        failCount++;
        lastErr = r.error ?? "";
      }
    }

    await ctx.sb.from("post_events").insert({
      post_id: f.postId,
      actor_reviewer_id: f.reviewerId,
      event_type: failCount ? "clickup_subtask_failed" : "clickup_subtask_created",
      description: failCount
        ? `Falha em ${failCount} subtarefa(s) no ClickUp: ${lastErr}`
        : `${okCount} subtarefa(s) criada(s) no ClickUp (uma por card)`,
    });
  }

  return { ok: true };
}
