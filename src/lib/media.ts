/**
 * Monta a URL pública de um objeto do bucket "media" (bucket é público).
 */
export function publicMediaUrl(storageKey: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/media/${storageKey}`;
}
