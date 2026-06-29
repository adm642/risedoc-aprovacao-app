"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseClickupContainer } from "@/lib/clickup";

const schema = z.object({
  projectId: z.string().uuid(),
  photoUrl: z.string().url().max(600).nullable().optional(),
  clickupFolder: z.string().max(500).nullable().optional(),
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
  if (Object.keys(patch).length === 0) return { ok: true };

  // RLS garante que o projeto pertence à agência do usuário
  const { error } = await sb.from("projects").update(patch).eq("id", d.projectId);
  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath(`/projetos/${d.projectId}`);
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
