import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import EquipeManager, { type Member } from "./EquipeManager";

export default async function EquipePage() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await sb
    .from("agency_members")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) redirect("/dashboard");

  const isAdmin = me.role === "admin";

  // Listagem com e-mails/nomes via service-role (área administrativa)
  const svc = createSupabaseServiceClient();
  const { data: memberRows } = await svc
    .from("agency_members")
    .select("user_id, role")
    .eq("agency_id", me.agency_id);
  const { data: list } = await svc.auth.admin.listUsers();
  const byId = new Map((list?.users ?? []).map((u) => [u.id, u]));

  const members: Member[] = (memberRows ?? []).map((m) => {
    const u = byId.get(m.user_id);
    return {
      userId: m.user_id,
      role: m.role,
      email: u?.email ?? "—",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: ((u?.user_metadata as any)?.full_name as string) ?? "",
    };
  });

  return (
    <main className="px-8 py-7">
      <div className="mb-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-900">
          Painel da agência
        </div>
        <h1 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-tight text-charcoal-900">
          Equipe
        </h1>
        <p className="mt-0.5 text-sm text-charcoal-900/60">
          {members.length} membro(s){isAdmin ? "" : " · somente leitura"}
        </p>
      </div>
      <EquipeManager members={members} isAdmin={isAdmin} currentUserId={user.id} />
    </main>
  );
}
