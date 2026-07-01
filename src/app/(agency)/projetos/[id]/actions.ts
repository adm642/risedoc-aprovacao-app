"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseClickupContainer } from "@/lib/clickup";
import { normalizeHandle } from "@/lib/handle";

const schema = z.object({
  projectId: z.string().uuid(),
  photoUrl: z.string().url().max(600).nullable().optional(),
  clickupFolder: z.string().max(500).nullable().optional(),
  instagramHandle: z.string().max(120).nullable().optional(),
});

export async function updateProjectSettings(
  input: z.input<typeof schema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const d = parsed.data;

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
  if (d.photoUrl !== undefined) patch.photo_url = d.photoUrl;
  if (d.clickupFolder !== undefined) {
    patch.clickup_folder_id = d.clickupFolder
      ? parseClickupContainer(d.clickupFolder)
      : null;
  }
  if (d.instagramHandle !== undefined) {
    patch.instagram_handle = normalizeHandle(d.instagramHandle);
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  // RLS garante que o projeto pertence à agência do usuário
  const { error } = await sb.from("projects").update(patch).eq("id", d.projectId);
  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath(`/projetos/${d.projectId}`);
  return { ok: true };
}

const groupNameSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export async function createGroup(
  input: z.input<typeof groupNameSchema>,
): Promise<{ ok: true; groupId: string } | { error: string }> {
  const parsed = groupNameSchema.safeParse(input);
  if (!parsed.success) return { error: "Dê um nome ao lote." };

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data, error } = await sb
    .from("approval_groups")
    .insert({
      project_id: parsed.data.projectId,
      name: parsed.data.name,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível criar o lote." };

  revalidatePath(`/projetos/${parsed.data.projectId}`);
  return { ok: true, groupId: data.id };
}

const renameSchema = z.object({
  groupId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export async function renameGroup(
  input: z.input<typeof renameSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { error: "Nome inválido." };

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await sb
    .from("approval_groups")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.groupId);
  if (error) return { error: "Não foi possível renomear o lote." };

  revalidatePath(`/projetos/${parsed.data.projectId}`);
  return { ok: true };
}

export async function deleteGroup(input: {
  groupId: string;
  projectId: string;
}): Promise<{ ok: true } | { error: string }> {
  if (
    !z.string().uuid().safeParse(input.groupId).success ||
    !z.string().uuid().safeParse(input.projectId).success
  )
    return { error: "Lote inválido." };

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // soft-delete: preserva posts (group_id intacto) e histórico de feedback
  const { error } = await sb
    .from("approval_groups")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.groupId);
  if (error) return { error: "Não foi possível excluir o lote." };

  revalidatePath(`/projetos/${input.projectId}`);
  return { ok: true };
}

export async function deleteProject(input: {
  projectId: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(input.projectId).success)
    return { error: "Cliente inválido." };

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // soft-delete do cliente (some do dashboard; posts/lotes/histórico ficam no banco)
  const { error } = await sb
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.projectId);
  if (error) return { error: "Não foi possível excluir o cliente." };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePost(input: {
  postId: string;
  projectId: string;
}): Promise<{ ok: true } | { error: string }> {
  if (
    !z.string().uuid().safeParse(input.postId).success ||
    !z.string().uuid().safeParse(input.projectId).success
  )
    return { error: "Post inválido." };

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // soft-delete (RLS garante que o post é da agência do usuário)
  const { error } = await sb
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.postId);
  if (error) return { error: "Não foi possível excluir o post." };

  revalidatePath(`/projetos/${input.projectId}`);
  return { ok: true };
}
