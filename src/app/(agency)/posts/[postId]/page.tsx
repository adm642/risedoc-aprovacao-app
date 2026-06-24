import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const sb = await createSupabaseServerClient();

  const { data: post } = await sb
    .from("posts")
    .select(
      "id, internal_title, status, suggested_publish_at, project_id, projects ( name ), post_targets ( network, format, caption, settings )",
    )
    .eq("id", postId)
    .maybeSingle();
  if (!post) notFound();

  const { data: feedbacks } = await sb
    .from("feedbacks")
    .select(
      "id, type, categories, slide_indexes, video_timestamps, comment, created_at, reviewer_sessions ( name, email )",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  const { data: events } = await sb
    .from("post_events")
    .select("id, event_type, description, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const t = one(post.post_targets);
  const demo = t?.settings?.demo ?? {};
  const slide = demo.slides?.[0] ?? { h: post.internal_title, bg: "#009E8E" };
  const project = one(post.projects);
  const isReel = t?.format === "reels";

  return (
    <main className="px-8 py-7">
      <Link
        href={`/projetos/${post.project_id}`}
        className="text-sm font-semibold text-brand-900 hover:underline"
      >
        ‹ Voltar para {project?.name ?? "o projeto"}
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* preview */}
        <div>
          <div className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm">
            <div
              className="relative flex flex-col justify-end p-5 text-white"
              style={{ aspectRatio: isReel ? "9/16" : "4/5", background: slide.bg }}
            >
              {isReel && (
                <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px]">
                  ▶ Reels
                </span>
              )}
              <div className="mb-auto text-[10px] uppercase tracking-wider opacity-90">
                {demo.kicker}
              </div>
              <h3 className="font-display text-xl drop-shadow">{slide.h}</h3>
              {slide.p && <p className="mt-1 text-xs opacity-90">{slide.p}</p>}
            </div>
            <div className="p-3 text-[13px] leading-relaxed">
              <b>@cliente</b> {t?.caption}
            </div>
          </div>
        </div>

        {/* coluna direita */}
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-charcoal-900/50">
            Detalhes do post
          </div>
          <h1 className="font-display text-xl font-bold text-charcoal-900">
            {post.internal_title}
          </h1>

          <h2 className="mb-3 mt-6 font-display text-sm font-semibold text-charcoal-900">
            Feedback do cliente
          </h2>
          {(feedbacks ?? []).length === 0 && (
            <p className="rounded-[10px] border border-dashed border-neutral-100 p-5 text-center text-sm text-charcoal-900/50">
              {post.status === "approved"
                ? "✓ Aprovado, sem ajustes."
                : "Ainda aguardando o cliente revisar."}
            </p>
          )}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {((feedbacks ?? []) as any[]).map((f) => {
            const reviewer = one(f.reviewer_sessions);
            const isChange = f.type === "change_request";
            return (
              <div
                key={f.id}
                className="mb-3 rounded-[10px] border p-3.5"
                style={{
                  borderColor: isChange ? "rgba(245,158,11,.4)" : "rgba(22,163,74,.4)",
                  background: isChange ? "rgba(245,158,11,.07)" : "rgba(22,163,74,.06)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-charcoal-900">
                    {reviewer?.name}
                  </span>
                  <span
                    className="ml-auto rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: isChange ? "rgba(245,158,11,.15)" : "rgba(22,163,74,.15)",
                      color: isChange ? "#b4730a" : "#16A34A",
                    }}
                  >
                    {isChange ? "Pedido de ajuste" : "Aprovado"}
                  </span>
                </div>

                {f.categories?.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {f.categories.map((c: string) => (
                      <span
                        key={c}
                        className="rounded-full border border-status-warning bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#b4730a]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {(f.slide_indexes?.length > 0 || f.video_timestamps?.length > 0) && (
                  <div className="mt-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-900/50">
                      Onde ajustar
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {f.slide_indexes?.map((i: number) => (
                        <span
                          key={`s${i}`}
                          className="rounded-md border border-neutral-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-900"
                        >
                          ▦ Card {i + 1}
                        </span>
                      ))}
                      {f.video_timestamps?.map((s: number) => (
                        <span
                          key={`t${s}`}
                          className="rounded-md border border-neutral-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#b4730a]"
                        >
                          ⏱ {fmt(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {f.comment && (
                  <p className="mt-2.5 rounded-lg border border-neutral-100 bg-white p-2.5 text-[13px] leading-relaxed">
                    “{f.comment}”
                  </p>
                )}
              </div>
            );
          })}

          {/* histórico */}
          <h2 className="mb-3 mt-6 font-display text-sm font-semibold text-charcoal-900">
            Histórico
          </h2>
          <div className="flex flex-col gap-0">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {((events ?? []) as any[]).map((e, i, arr) => (
              <div key={e.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                  {i < arr.length - 1 && <div className="w-0.5 flex-1 bg-neutral-100" />}
                </div>
                <div className="pb-4">
                  <div className="text-[13px] font-semibold text-charcoal-900">
                    {e.description ?? e.event_type}
                  </div>
                  <div className="text-[11px] text-charcoal-900/50">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
            ))}
            {(events ?? []).length === 0 && (
              <p className="text-sm text-charcoal-900/50">Sem eventos registrados.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
