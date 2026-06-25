"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseClickupTaskId } from "@/lib/clickup";

const mediaSchema = z.object({
  type: z.enum(["image", "video"]),
  storageKey: z.string().min(1),
});

const schema = z.object({
  projectId: z.string().uuid(),
  groupId: z.string().uuid().nullable(),
  newGroupName: z.string().max(80).optional(),
  title: z.string().min(1).max(160),
  format: z.enum(["feed", "reels", "story"]),
  caption: z.string().max(4000).optional(),
  suggestedAt: z.string().optional(),
  clickupLink: z.string().max(500).optional(),
  media: z.array(mediaSchema).min(1),
});

export async function createPost(
  input: z.input<typeof schema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Preencha o título e envie ao menos uma mídia." };
  const d = parsed.data;

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // member id (autor)
  const { data: member } = await sb
    .from("agency_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // grupo: usa existente ou cria novo (RLS garante que o projeto é da agência)
  let groupId = d.groupId;
  if (!groupId && d.newGroupName) {
    const { data: g, error: ge } = await sb
      .from("approval_groups")
      .insert({ project_id: d.projectId, name: d.newGroupName, status: "awaiting_review" })
      .select("id")
      .single();
    if (ge) return { error: "Não foi possível criar o lote." };
    groupId = g.id;
  }

  // post
  const { data: post, error: pe } = await sb
    .from("posts")
    .insert({
      project_id: d.projectId,
      group_id: groupId,
      internal_title: d.title,
      status: "awaiting_review",
      suggested_publish_at: d.suggestedAt || null,
      created_by: member?.id ?? null,
      clickup_task_id: parseClickupTaskId(d.clickupLink ?? ""),
    })
    .select("id")
    .single();
  if (pe) return { error: "Não foi possível criar o post." };

  // target (versão por rede)
  const { data: target, error: te } = await sb
    .from("post_targets")
    .insert({
      post_id: post.id,
      network: "instagram",
      format: d.format,
      caption: d.caption ?? "",
      settings: {},
    })
    .select("id")
    .single();
  if (te) return { error: "Não foi possível salvar a legenda." };

  // mídias
  const mediaRows = d.media.map((m, i) => ({
    post_id: post.id,
    type: m.type,
    storage_key: m.storageKey,
    position: i,
    version: 1,
    is_current: true,
  }));
  const { error: me } = await sb.from("post_media").insert(mediaRows);
  if (me) return { error: "Não foi possível salvar as mídias." };

  // histórico
  await sb.from("post_events").insert({
    post_id: post.id,
    actor_member_id: member?.id ?? null,
    event_type: "created",
    resulting_status: "awaiting_review",
    description: "Post criado e adicionado ao lote",
  });

  void target;
  revalidatePath(`/projetos/${d.projectId}`);
  return { ok: true };
}
