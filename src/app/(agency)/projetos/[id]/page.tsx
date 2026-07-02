import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  PenLine,
  Play,
  Plus,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicMediaUrl } from "@/lib/media";
import { statusMeta, type StatusTone } from "@/lib/status-meta";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import GroupsList, { type GroupItem } from "./GroupsList";
import ClientSettings from "./ClientSettings";
import PostCardMenu from "./PostCardMenu";

/* Borda esquerda do card por tom do status (info = bola com o cliente,
   warning = requer minha ação). Labels/tons vêm de status-meta. */
const TONE_BORDER: Record<StatusTone, string> = {
  neutral: "border-l-neutral-200",
  info: "border-l-status-info",
  warning: "border-l-status-warning",
  success: "border-l-status-success",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default async function ProjetoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fpage?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const PAGE = 20;
  const fpage = Math.max(1, parseInt(sp.fpage ?? "1", 10) || 1);
  const sb = await createSupabaseServerClient();

  const { data: project } = await sb
    .from("projects")
    .select("id, name, photo_url, clickup_folder_id, instagram_handle")
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
    .is("deleted_at", null)
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

  const { data: feedbacks, count: fcount } = await sb
    .from("feedbacks")
    .select(
      "id, post_id, type, categories, slide_indexes, video_timestamps, comment, resolved_at, posts!inner ( internal_title, project_id ), reviewer_sessions ( name )",
      { count: "exact" },
    )
    .eq("posts.project_id", id)
    .order("created_at", { ascending: false })
    .range((fpage - 1) * PAGE, fpage * PAGE - 1);

  const totalPages = Math.max(1, Math.ceil((fcount ?? 0) / PAGE));

  return (
    <main className="px-8 py-7">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-900 hover:underline"
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
        Voltar para Dashboard
      </Link>
      <div className="mt-4 mb-6 flex items-center gap-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(project as any).photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            src={(project as any).photo_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-900 font-display text-2xl font-bold text-white">
            {project.name.charAt(0)}
          </span>
        )}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-900">
            Cliente
          </div>
          <h1 className="mt-0.5 font-display text-[28px] font-bold leading-tight tracking-tight text-charcoal-900">
            {project.name}
          </h1>
          <p className="text-sm text-charcoal-900/60">Meus posts</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ClientSettings
            projectId={project.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            photoUrl={(project as any).photo_url ?? null}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clickupFolder={(project as any).clickup_folder_id ?? null}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            instagramHandle={(project as any).instagram_handle ?? null}
            name={project.name}
          />
          <Button href={`/projetos/${id}/calendario`} variant="ghost">
            <CalendarDays size={16} strokeWidth={1.5} aria-hidden />
            Calendário
          </Button>
          <Button href={`/projetos/${id}/novo`}>
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            Novo post
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {((posts ?? []) as any[]).map((p) => {
          const t = one(p.post_targets);
          const demo = t?.settings?.demo ?? {};
          const slide = demo.slides?.[0] ?? { h: p.internal_title, bg: "#009E8E" };
          const tone = statusMeta(p.status).tone;
          const isReel = t?.format === "reels";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const media = ((p.post_media ?? []) as any[])
            .filter((m) => m.is_current)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const first = media[0];
          return (
            <div key={p.id} className="relative">
              <PostCardMenu postId={p.id} projectId={id} title={p.internal_title} />
            <Link
              href={`/posts/${p.id}`}
              className={`block overflow-hidden rounded-[10px] border border-neutral-100 border-l-4 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md ${TONE_BORDER[tone]}`}
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
                <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px]">
                  {isReel ? (
                    <>
                      <Play size={9} strokeWidth={1.5} fill="currentColor" aria-hidden />
                      Reels
                    </>
                  ) : media.length > 1 || demo.slides?.length > 1 ? (
                    "Carrossel"
                  ) : (
                    "Feed"
                  )}
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
                <StatusBadge status={p.status} />
              </div>
            </Link>
            </div>
          );
        })}
      </div>
      {(posts ?? []).length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-white/60 py-12 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/graf-octagons.png"
            alt=""
            aria-hidden
            className="h-12 w-auto select-none opacity-20"
            draggable={false}
          />
          <p className="text-sm text-charcoal-900/55">
            Nenhum post neste projeto ainda.
          </p>
          <Button href={`/projetos/${id}/novo`} variant="secondary" size="sm">
            <Plus size={14} strokeWidth={1.5} aria-hidden />
            Criar o primeiro post
          </Button>
        </div>
      )}

      <h2 className="mb-3 mt-10 font-display text-base font-semibold text-charcoal-900">
        Grupos de aprovação
      </h2>
      <GroupsList groups={groups} projectId={id} />

      <div className="mb-3 mt-10 flex items-baseline gap-3">
        <h2 className="font-display text-base font-semibold text-charcoal-900">
          Feedbacks recentes
        </h2>
        {(fcount ?? 0) > 0 && (
          <span className="text-xs text-charcoal-900/45">{fcount} no total</span>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
        {(feedbacks ?? []).length === 0 && (
          <p className="p-5 text-sm text-charcoal-900/50">
            Nenhum feedback ainda. Quando o cliente revisar, aparece aqui.
          </p>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {((feedbacks ?? []) as any[]).map((f) => {
          const reviewer = one(f.reviewer_sessions);
          const post = one(f.posts);
          const isChange = f.type === "change_request";
          return (
            <Link
              key={f.id}
              href={`/posts/${f.post_id}`}
              className={`flex flex-col gap-1.5 border-b border-neutral-100 px-5 py-3.5 last:border-0 hover:bg-neutral-50 ${f.resolved_at ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isChange
                      ? "bg-status-warning/15 text-status-warning-ink"
                      : "bg-status-success/15 text-status-success-ink"
                  }`}
                >
                  {isChange ? (
                    <PenLine size={12} strokeWidth={1.5} aria-hidden />
                  ) : (
                    <Check size={12} strokeWidth={2.25} aria-hidden />
                  )}
                  {isChange ? "Pedido de ajuste" : "Aprovado"}
                </span>
                <span className="font-semibold text-charcoal-900">
                  {post?.internal_title ?? "Post"}
                </span>
                {f.resolved_at && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-success-ink">
                    · resolvido
                    <Check size={12} strokeWidth={2.25} aria-hidden />
                  </span>
                )}
                <span className="ml-auto text-xs text-charcoal-900/45">{reviewer?.name}</span>
              </div>
              {(f.slide_indexes?.length > 0 || f.video_timestamps?.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {f.slide_indexes?.map((i: number) => (
                    <span
                      key={`s${i}`}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-0.5 text-xs font-semibold text-brand-900"
                    >
                      <LayoutGrid size={11} strokeWidth={1.5} aria-hidden />
                      Card {i + 1}
                    </span>
                  ))}
                  {f.video_timestamps?.map((sx: number) => (
                    <span
                      key={`t${sx}`}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-0.5 text-xs font-semibold text-status-warning-ink"
                    >
                      <Clock size={11} strokeWidth={1.5} aria-hidden />
                      {fmt(sx)}
                    </span>
                  ))}
                </div>
              )}
              {f.comment && <p className="text-sm text-charcoal-900/70">“{f.comment}”</p>}
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-5">
          {fpage > 1 ? (
            <Link
              href={`/projetos/${id}?fpage=${fpage - 1}`}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold text-brand-900 hover:bg-neutral-50"
            >
              <ChevronLeft size={15} strokeWidth={1.5} aria-hidden />
              Anterior
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-charcoal-900/30">
              <ChevronLeft size={15} strokeWidth={1.5} aria-hidden />
              Anterior
            </span>
          )}
          <span className="text-sm text-charcoal-900/55">
            Página {fpage} de {totalPages}
          </span>
          {fpage < totalPages ? (
            <Link
              href={`/projetos/${id}?fpage=${fpage + 1}`}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold text-brand-900 hover:bg-neutral-50"
            >
              Próxima
              <ChevronRight size={15} strokeWidth={1.5} aria-hidden />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-charcoal-900/30">
              Próxima
              <ChevronRight size={15} strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </div>
      )}
    </main>
  );
}
