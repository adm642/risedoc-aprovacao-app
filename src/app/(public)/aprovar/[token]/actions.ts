"use server";

import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClickupSubtask } from "@/lib/clickup";

function fmtSec(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://risedoc-aprovacao-app.vercel.app";

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
