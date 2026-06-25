"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Gera uma URL de upload assinada (autorizada pela service-role no servidor).
 * O navegador então envia o arquivo direto ao Supabase com esse token —
 * sem depender da resolução de role/RLS no Storage.
 *
 * Exige usuário autenticado (membro da agência) para evitar abuso.
 */
export async function createSignedUpload(
  path: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.storage
    .from("media")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível preparar o upload." };
  }
  return { path: data.path, token: data.token };
}
