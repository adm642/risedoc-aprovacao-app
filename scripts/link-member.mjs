/**
 * Vincula um usuário (já criado no Supabase Auth pelo próprio usuário)
 * à agência demo, como admin. Não lida com senha.
 * Uso: MEMBER_EMAIL="..." node --env-file=.env.local scripts/link-member.mjs
 */
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const EMAIL = process.env.MEMBER_EMAIL;
if (!EMAIL) { console.error("Defina MEMBER_EMAIL"); process.exit(1); }

const { data: agency } = await sb.from("agencies").select("id").eq("name", "Risedoc (demo)").single();

const { data: list, error: le } = await sb.auth.admin.listUsers();
if (le) { console.error("listUsers:", le.message); process.exit(1); }
const user = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
if (!user) { console.error("Usuário não encontrado:", EMAIL, "— crie no painel do Supabase primeiro."); process.exit(1); }

const { error } = await sb.from("agency_members").upsert(
  { agency_id: agency.id, user_id: user.id, role: "admin" },
  { onConflict: "agency_id,user_id" }
);
if (error) { console.error("vincular:", error.message); process.exit(1); }

console.log("✓ Usuário vinculado à agência 'Risedoc (demo)' como admin:");
console.log("  ", EMAIL, "→", user.id);
