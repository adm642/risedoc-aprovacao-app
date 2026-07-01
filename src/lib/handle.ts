/**
 * Normaliza um @ de Instagram: remove "@", espaços e URL, mantém só os
 * caracteres válidos (letras, números, ponto e underscore), minúsculo,
 * máx. 30 chars. Retorna null se ficar vazio.
 */
export function normalizeHandle(input: string | null | undefined): string | null {
  if (!input) return null;
  let h = input.trim();
  // aceita colar a URL do perfil (instagram.com/fulano)
  const m = h.match(/instagram\.com\/([^/?#]+)/i);
  if (m) h = m[1];
  h = h
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 30);
  return h.length > 0 ? h : null;
}
