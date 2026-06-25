import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NET_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  threads: "Threads",
  youtube: "YouTube",
  pinterest: "Pinterest",
  gmb: "Google",
};
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const PALETTE = ["#009E8E", "#2563EB", "#F59E0B", "#16A34A", "#7C3AED", "#DC2626"];

function ymLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MES[Number(m) - 1]}/${y.slice(2)}`;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function DashboardPage() {
  const sb = await createSupabaseServerClient();

  const { data: projects } = await sb
    .from("projects")
    .select("id, name, project_networks ( network ), posts ( status, post_targets ( network ) )")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const { data: refRows } = await sb
    .from("feedbacks")
    .select("created_at, posts ( project_id )")
    .eq("type", "change_request");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projList = (projects ?? []) as any[];

  // refações por projeto por mês
  const byProj: Record<string, Record<string, number>> = {};
  const monthSet = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (refRows ?? []) as any[]) {
    const pid = one(r.posts)?.project_id;
    if (!pid) continue;
    const d = new Date(r.created_at);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthSet.add(ym);
    byProj[pid] = byProj[pid] || {};
    byProj[pid][ym] = (byProj[pid][ym] || 0) + 1;
  }
  const months = Array.from(monthSet).sort().slice(-6);
  let maxCount = 1;
  for (const pid in byProj) for (const m of months) maxCount = Math.max(maxCount, byProj[pid][m] || 0);
  const totalRef = Object.values(byProj).reduce(
    (s, m) => s + Object.values(m).reduce((a, b) => a + b, 0),
    0,
  );

  return (
    <main className="px-8 py-7">
      <div className="mb-6 flex items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-charcoal-900">
            Visão geral
          </h1>
          <p className="text-sm text-charcoal-900/60">
            {projList.length} cliente(s) ativo(s)
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className="ml-auto rounded-[10px] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
        >
          + Cadastrar novo cliente
        </Link>
      </div>

      {/* CLIENTES */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projList.map((p) => {
          const posts = p.posts ?? [];
          const c = (s: string) =>
            posts.filter((x: { status: string }) => x.status === s).length;
          const platforms = Array.from(
            new Set<string>([
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...((p.project_networks ?? []) as any[]).map((n) => n.network),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...((posts as any[]).flatMap((post) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (post.post_targets ?? []).map((t: any) => t.network),
              )),
            ]),
          ).filter(Boolean);

          return (
            <Link
              key={p.id}
              href={`/projetos/${p.id}`}
              className="rounded-2xl border border-neutral-100 bg-white p-[18px] transition-all hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-gradient-to-br from-brand-500 to-brand-900 font-display text-lg font-bold text-white">
                  {p.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-charcoal-900">{p.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {platforms.length > 0 ? (
                      platforms.map((n) => (
                        <span
                          key={n}
                          className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-charcoal-900/60"
                        >
                          {NET_LABELS[n] ?? n}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-charcoal-900/40">
                        Sem plataformas ainda
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-4 border-t border-neutral-100 pt-3.5 text-xs text-charcoal-900/60">
                <Stat n={c("awaiting_review")} label="aguardando" />
                <Stat n={c("change_requested")} label="ajustes" color="#b4730a" />
                <Stat n={c("approved")} label="aprovados" color="#16A34A" />
              </div>
            </Link>
          );
        })}

        <Link
          href="/clientes/novo"
          className="flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed border-neutral-100 text-sm font-semibold text-charcoal-900/50 transition-colors hover:border-brand-500 hover:text-brand-900"
        >
          + Cadastrar novo cliente
        </Link>
      </div>

      {/* GRÁFICO DE REFAÇÕES */}
      <h2 className="font-display text-base font-semibold text-charcoal-900">
        Refações por cliente ao longo do tempo
      </h2>
      <p className="mb-4 text-sm text-charcoal-900/55">
        🎯 Meta: diminuir as refações ao longo do projeto.
      </p>

      <div className="rounded-2xl border border-neutral-100 bg-white p-5">
        {totalRef === 0 ? (
          <p className="py-4 text-center text-sm text-charcoal-900/50">
            Nenhuma refação registrada ainda — ótimo sinal! 🎉
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {projList
              .filter((p) => byProj[p.id])
              .map((p, idx) => {
                const color = PALETTE[idx % PALETTE.length];
                const total = Object.values(byProj[p.id]).reduce((a, b) => a + b, 0);
                return (
                  <div key={p.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-charcoal-900">{p.name}</span>
                      <span className="text-xs text-charcoal-900/55">{total} refação(ões)</span>
                    </div>
                    <div className="flex items-end gap-3" style={{ height: 72 }}>
                      {months.map((m) => {
                        const count = byProj[p.id][m] || 0;
                        const h = count > 0 ? Math.max(6, (count / maxCount) * 56) : 0;
                        return (
                          <div key={m} className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-semibold text-charcoal-900/70">
                              {count || ""}
                            </span>
                            <div
                              className="w-5 rounded-t"
                              style={{ height: h, background: color, opacity: count ? 1 : 0.12 }}
                            />
                            <span className="text-[9px] text-charcoal-900/45">{ymLabel(m)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color?: string }) {
  return (
    <div>
      <b className="block font-display text-lg font-bold" style={{ color: color ?? "#1C1C1E" }}>
        {n}
      </b>
      {label}
    </div>
  );
}
