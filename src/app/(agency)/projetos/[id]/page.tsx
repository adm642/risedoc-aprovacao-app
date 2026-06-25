import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicMediaUrl } from "@/lib/media";
import GroupsList, { type GroupItem } from "./GroupsList";

const STATUS: Record<string, { label: string; border: string; badge: string; ink: string }> = {
  draft: { label: "Rascunho", border: "#E6E6DF", badge: "rgba(28,28,30,.06)", ink: "#1C1C1E" },
  awaiting_review: { label: "Aguardando revisão", border: "#F59E0B", badge: "rgba(245,158,11,.15)", ink: "#b4730a" },
  change_requested: { label: "Pedido de ajuste", border: "#F59E0B", badge: "rgba(245,158,11,.15)", ink: "#b4730a" },
  approved: { label: "Aprovado", border: "#16A34A", badge: "rgba(22,163,74,.12)", ink: "#16A34A" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await createSupabaseServerClient();

  const { data: project } = await sb
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: posts } = await sb
    .from("posts")
    .select("id, internal_title, status, suggested_publish_at, post_targets ( network, format, settings ), post_media ( type, storage_key, position, is_current )")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const { data: groupsRaw } = await sb
    .from("approval_groups")
    .select("id, name, public_token, posts ( status )")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: GroupItem[] = ((groupsRaw ?? []) as any[]).map((g) => {
    const gp = (g.posts ?? []) as { status: string }[];
    return {
      id: g.id,
      name: g.name,
      token: g.public_token,
      awaiting: gp.filter((x) => x.status === "awaiting_review").length,
      changes: gp.filter((x) => x.status === "change_requested").length,
      approved: gp.filter((x) => x.status === "approved").length,
      total: gp.length,
    };
  });

  return (
    <main className="px-8 py-7">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-900 hover:underline">
        ‹ Voltar para Dashboard
      </Link>
      <div className="mt-3 mb-6 flex items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-charcoal-900">
            {project.name}
          </h1>
          <p className="text-sm text-charcoal-900/60">Meus posts</p>
        </div>
        <Link
          href={`/projetos/${id}/novo`}
          className="ml-auto rounded-[10px] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
        >
          + Novo post
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {((posts ?? []) as any[]).map((p) => {
          const t = one(p.post_targets);
          const demo = t?.settings?.demo ?? {};
          const slide = demo.slides?.[0] ?? { h: p.internal_title, bg: "#009E8E" };
          const st = STATUS[p.status] ?? STATUS.draft;
          const isReel = t?.format === "reels";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const media = ((p.post_media ?? []) as any[])
            .filter((m) => m.is_current)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const first = media[0];
          return (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              className="overflow-hidden rounded-[10px] border border-neutral-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderLeft: `4px solid ${st.border}` }}
            >
              <div
                className="relative flex flex-col justify-end overflow-hidden p-3.5 text-white"
                style={{ aspectRatio: "4/5", background: first ? "#000" : slide.bg }}
              >
                {first && first.type === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicMediaUrl(first.storage_key)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                {first && first.type === "video" && (
                  <video src={publicMediaUrl(first.storage_key)} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
                )}
                <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[10px]">
                  {isReel ? "▶ Reels" : media.length > 1 || demo.slides?.length > 1 ? "Carrossel" : "Feed"}
                </span>
                {!first && (
                  <>
                    <div className="mb-auto text-[10px] uppercase tracking-wider opacity-90">
                      {demo.kicker}
                    </div>
                    <h3 className="font-display text-sm leading-tight drop-shadow">{slide.h}</h3>
                  </>
                )}
              </div>
              <div className="p-3">
                <span
                  className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: st.badge, color: st.ink }}
                >
                  {st.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      {(posts ?? []).length === 0 && (
        <p className="text-sm text-charcoal-900/50">Nenhum post neste projeto ainda.</p>
      )}

      <h2 className="mb-3 mt-10 font-display text-base font-semibold text-charcoal-900">
        Grupos de aprovação
      </h2>
      <GroupsList groups={groups} />
    </main>
  );
}
