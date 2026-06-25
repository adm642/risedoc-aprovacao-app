import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Upload de mídia para o bucket "media", direto do navegador para o Supabase.
 * Usa o cliente autenticado (anexa a sessão automaticamente → passa pelo RLS).
 * Vai direto ao Supabase (não passa pela Vercel), então aguenta arquivos grandes.
 */
export async function uploadMedia(file: File, key: string): Promise<void> {
  const sb = createSupabaseBrowserClient();
  const { error } = await sb.storage.from("media").upload(key, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
}
