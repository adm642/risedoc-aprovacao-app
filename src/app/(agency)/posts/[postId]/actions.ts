"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ctx() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: member } = await sb
    .from("agency_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { sb, memberId: member?.id ?? null };
}

const captionSchema = z.object({
  postId: z.string().uuid(),
  targetId: z.string().uuid(),
  caption: z.string().max(4000),
});

export async function updateCaption(
  input: z.input<typeof captionSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = captionSchema.safeParse(input);
  if (!parsed.success) return { error: "Legenda inválida." };
  const c = await ctx();
  if (!c) return { error: "Sessão expirada." };

  const { error } = await c.sb
    .from("post_targets")
    .update({ caption: parsed.data.caption })
    .eq("id", parsed.data.targetId);
  if (error) return { error: "Não foi possível salvar a legenda." };

  await c.sb.from("post_events").insert({
    post_id: parsed.data.postId,
    actor_member_id: c.memberId,
    event_type: "caption_edited",
    description: "Legenda editada na plataforma",
  });

  revalidatePath(`/posts/${parsed.data.postId}`);
  return { ok: true };
}

const updatePostSchema = z.object({
  postId: z.string().uuid(),
  targetId: z.string().uuid().nullable(),
  title: z.string().min(1).max(160),
  caption: z.string().max(4000),
  suggestedAt: z.string().optional(),
});

export async function updatePost(
  input: z.input<typeof updatePostSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) return { error: "Preencha o título do post." };
  const d = parsed.data;
  const c = await ctx();
  if (!c) return { error: "Sessão expirada." };

  const { error: pe } = await c.sb
    .from("posts")
    .update({
      internal_title: d.title,
      suggested_publish_at: d.suggestedAt || null,
    })
    .eq("id", d.postId);
  if (pe) return { error: "Não foi possível salvar o post." };

  if (d.targetId) {
    const { error: te } = await c.sb
      .from("post_targets")
      .update({ caption: d.caption })
      .eq("id", d.targetId);
    if (te) return { error: "Não foi possível salvar a legenda." };
  }

  await c.sb.from("post_events").insert({
    post_id: d.postId,
    actor_member_id: c.memberId,
    event_type: "post_edited",
    description: "Post editado na plataforma",
  });

  revalidatePath(`/posts/${d.postId}`);
  return { ok: true };
}

const correctedSchema = z.object({
  postId: z.string().uuid(),
  media: z
    .array(
      z.object({
        storageKey: z.string().min(1),
        type: z.enum(["image", "video"]),
      }),
    )
    .min(1),
});

export async function addCorrectedMedia(
  input: z.input<typeof correctedSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = correctedSchema.safeParse(input);
  if (!parsed.success) return { error: "Mídia inválida." };
  const c = await ctx();
  if (!c) return { error: "Sessão expirada." };

  const { data: current } = await c.sb
    .from("post_media")
    .select("version")
    .eq("post_id", parsed.data.postId)
    .eq("is_current", true);
  const maxVersion = (current ?? []).reduce(
    (m, x) => Math.max(m, (x as { version: number }).version ?? 1),
    1,
  );

  // arquiva a versão atual
  await c.sb
    .from("post_media")
    .update({ is_current: false })
    .eq("post_id", parsed.data.postId)
    .eq("is_current", true);

  // insere a nova versão (conjunto corrigido)
  const rows = parsed.data.media.map((m, i) => ({
    post_id: parsed.data.postId,
    type: m.type,
    storage_key: m.storageKey,
    position: i,
    version: maxVersion + 1,
    is_current: true,
  }));
  const { error } = await c.sb.from("post_media").insert(rows);
  if (error) return { error: "Não foi possível salvar o material." };

  await c.sb.from("post_events").insert({
    post_id: parsed.data.postId,
    actor_member_id: c.memberId,
    event_type: "correction_uploaded",
    description: `Material corrigido enviado (v${maxVersion + 1})`,
  });

  revalidatePath(`/posts/${parsed.data.postId}`);
  return { ok: true };
}

export async function toggleFeedbackResolved(input: {
  feedbackId: string;
  postId: string;
  resolved: boolean;
}): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(input.feedbackId).success)
    return { error: "Feedback inválido." };
  const c = await ctx();
  if (!c) return { error: "Sessão expirada." };

  const { error } = await c.sb
    .from("feedbacks")
    .update({ resolved_at: input.resolved ? new Date().toISOString() : null })
    .eq("id", input.feedbackId);
  if (error) return { error: "Não foi possível atualizar." };

  // registra no histórico (somente ao resolver)
  if (input.resolved) {
    const { data: fb } = await c.sb
      .from("feedbacks")
      .select("slide_indexes, comment")
      .eq("id", input.feedbackId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slides = ((fb as any)?.slide_indexes ?? []) as number[];
    const where =
      slides.length > 0 ? ` (Card ${slides.map((i) => i + 1).join(", ")})` : "";
    await c.sb.from("post_events").insert({
      post_id: input.postId,
      actor_member_id: c.memberId,
      event_type: "feedback_resolved",
      description: `Ajuste marcado como resolvido${where}`,
    });
  }

  revalidatePath(`/posts/${input.postId}`);
  return { ok: true };
}

export async function resendForApproval(input: {
  postId: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(input.postId).success)
    return { error: "Post inválido." };
  const c = await ctx();
  if (!c) return { error: "Sessão expirada." };

  const { error } = await c.sb
    .from("posts")
    .update({ status: "awaiting_review" })
    .eq("id", input.postId);
  if (error) return { error: "Não foi possível reenviar." };

  await c.sb.from("post_events").insert({
    post_id: input.postId,
    actor_member_id: c.memberId,
    event_type: "resent",
    resulting_status: "awaiting_review",
    description: "Reenviado para aprovação",
  });

  revalidatePath(`/posts/${input.postId}`);
  return { ok: true };
}
