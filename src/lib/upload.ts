import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSignedUpload } from "@/lib/storage-actions";

/**
 * Upload de mídia para o bucket "media".
 * 1) servidor gera URL de upload assinada (service-role) → contorna RLS/role;
 * 2) navegador envia o arquivo direto ao Supabase com o token assinado.
 * Vai direto ao Supabase (não passa pela Vercel), então aguenta arquivos grandes.
 */
export async function uploadMedia(file: File, key: string): Promise<void> {
  const signed = await createSignedUpload(key);
  if ("error" in signed) throw new Error(signed.error);

  const sb = createSupabaseBrowserClient();
  const { error } = await sb.storage
    .from("media")
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
    });
  if (error) throw new Error(error.message);
}
