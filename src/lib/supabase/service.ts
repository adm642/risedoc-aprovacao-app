import { createClient } from "@supabase/supabase-js";
import "server-only";

/**
 * ⚠️ SERVER-ONLY. Bypassa RLS (usa a service_role key).
 *
 * Uso EXCLUSIVO: Route Handlers do fluxo público (/api/public/[token]),
 * onde o revisor não tem sessão (auth.uid() é nulo). Toda query deve ser
 * MANUALMENTE escopada pelo public_token → group_id.
 *
 * NUNCA importar em Client Components — o import "server-only" quebra o build
 * se isso acontecer.
 */
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
