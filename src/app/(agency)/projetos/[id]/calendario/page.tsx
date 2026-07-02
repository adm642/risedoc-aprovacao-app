import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicMediaUrl } from "@/lib/media";
import PostCalendar, { type CalendarPost } from "@/components/PostCalendar";

export default async function CalendarioPage({
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
    .select(
      "id, internal_title, status, suggested_publish_at, post_media ( type, storage_key, position, is_current )",
    )
    .eq("project_id", id)
    .is("deleted_at", null)
    .not("suggested_publish_at", "is", null)
    .order("suggested_publish_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: CalendarPost[] = ((posts ?? []) as any[]).map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = ((p.post_media ?? []) as any[])
      .filter((m) => m.is_current)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
    return {
      id: p.id,
      title: p.internal_title,
      date: p.suggested_publish_at,
      status: p.status,
      thumb: first && first.type === "image" ? publicMediaUrl(first.storage_key) : null,
    };
  });

  return (
    <main className="px-8 py-7">
      <Link
        href={`/projetos/${id}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-900 hover:underline"
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
        Voltar para {project.name}
      </Link>
      <h1 className="mb-1 mt-3 font-display text-2xl font-bold tracking-tight text-charcoal-900">
        Calendário
      </h1>
      <p className="mb-6 text-sm text-charcoal-900/60">
        {project.name} — datas planejadas de publicação
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-charcoal-900/50">
          Nenhum post com data sugerida ainda. Defina a “Data sugerida” ao criar
          ou editar um post para vê-lo aqui.
        </p>
      ) : (
        <PostCalendar posts={items} hrefBase="/posts" />
      )}
    </main>
  );
}
