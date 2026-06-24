import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one<T = any>(v: any): T {
  return Array.isArray(v) ? v[0] : v;
}

export default async function DashboardPage() {
  const sb = await createSupabaseServerClient();

  const { data: projects } = await sb
    .from("projects")
    .select("id, name, posts(status)")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const { data: feedbacks } = await sb
    .from("feedbacks")
    .select(
      "id, type, categories, slide_indexes, video_timestamps, comment, created_at, posts ( internal_title, projects ( name ) ), reviewer_sessions ( name )",
    )
    .order("created_at", { ascending: false })
    .limit(8);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projList = (projects ?? []) as any[];
  const count = (status: string) =>
    projList.reduce(
      (acc, p) =>
        acc + (p.posts ?? []).filter((x: { status: string }) => x.status === status).length,
      0,
    );

  const awaiting = count("awaiting_review");
  const changes = count("change_requested");
  const approved = count("approved");

  return (
    <main className="px-8 py-7">
      <h1 className="font-display text-2xl font-bold tracking-tight text-charcoal-900">
        Visão geral
      </h1>
      <p className="mb-6 text-sm text-charcoal-900/60">
        {projList.length} cliente(s) ativo(s)
      </p>

      {/* resumo */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Aguardando revisão" value={awaiting} color="#F59E0B" />
        <SummaryCard label="Pedido de ajuste" value={changes} color="#F59E0B" />
        <SummaryCard label="Aprovados" value={approved} color="#16A34A" />
      </div>

      {/* clientes */}
      <h2 className="mb-3 font-display text-base font-semibold text-charcoal-900">
        Clientes
      </h2>
      <div className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projList.map((p) => {
          const posts = p.posts ?? [];
          const c = (s: string) => posts.filter((x: { status: string }) => x.status === s).length;
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
                <div className="font-semibold text-charcoal-900">{p.name}</div>
              </div>
              <div className="mt-4 flex gap-4 border-t border-neutral-100 pt-3.5 text-xs text-charcoal-900/60">
                <Stat n={c("awaiting_review")} label="aguardando" />
                <Stat n={c("change_requested")} label="ajustes" color="#b4730a" />
                <Stat n={c("approved")} label="aprovados" color="#16A34A" />
              </div>
            </Link>
          );
        })}
        {projList.length === 0 && (
          <p className="text-sm text-charcoal-900/50">
            Nenhum cliente ainda. (A criação de projetos/posts vem no próximo passo.)
          </p>
        )}
      </div>

      {/* feedbacks recebidos */}
      <h2 className="mb-3 font-display text-base font-semibold text-charcoal-900">
        Feedbacks recentes dos clientes
      </h2>
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
        {(feedbacks ?? []).length === 0 && (
          <p className="p-5 text-sm text-charcoal-900/50">
            Nenhum feedback ainda. Quando um cliente revisar, aparece aqui.
          </p>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {((feedbacks ?? []) as any[]).map((f) => {
          const post = one(f.posts);
          const project = one(post?.projects);
          const reviewer = one(f.reviewer_sessions);
          const isChange = f.type === "change_request";
          return (
            <div
              key={f.id}
              className="flex flex-col gap-1.5 border-b border-neutral-100 px-5 py-3.5 last:border-0"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isChange
                      ? "bg-status-warning/15 text-[#b4730a]"
                      : "bg-status-success/15 text-status-success"
                  }`}
                >
                  {isChange ? "✏ Pedido de ajuste" : "✓ Aprovado"}
                </span>
                <span className="font-semibold text-charcoal-900">
                  {post?.internal_title ?? "Post"}
                </span>
                <span className="text-charcoal-900/50">· {project?.name}</span>
                <span className="ml-auto text-xs text-charcoal-900/45">
                  {reviewer?.name}
                </span>
              </div>
              {(f.slide_indexes?.length > 0 || f.video_timestamps?.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {f.slide_indexes?.map((i: number) => (
                    <span
                      key={`s${i}`}
                      className="rounded-md border border-neutral-100 bg-neutral-50 px-2 py-0.5 text-xs font-semibold text-brand-900"
                    >
                      ▦ Card {i + 1}
                    </span>
                  ))}
                  {f.video_timestamps?.map((s: number) => (
                    <span
                      key={`t${s}`}
                      className="rounded-md border border-neutral-100 bg-neutral-50 px-2 py-0.5 text-xs font-semibold text-[#b4730a]"
                    >
                      ⏱ {fmt(s)}
                    </span>
                  ))}
                </div>
              )}
              {f.comment && (
                <p className="text-sm text-charcoal-900/70">“{f.comment}”</p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5">
      <div className="flex items-center gap-2 text-sm text-charcoal-900/60">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
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
