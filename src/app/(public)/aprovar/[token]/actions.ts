"use server";

import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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
    .select("id, post_targets ( id )")
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

  return { ok: true };
}
