import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NovoPost from "./NovoPost";

export default async function NovoPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await createSupabaseServerClient();

  const { data: project } = await sb
    .from("projects")
    .select("id, name, clickup_folder_id")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: groups } = await sb
    .from("approval_groups")
    .select("id, name")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <main className="px-8 py-7">
      <Link
        href={`/projetos/${id}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-900 hover:underline"
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
        Voltar para {project.name}
      </Link>
      <div className="mb-6 mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-900">
          {project.name}
        </div>
        <h1 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-tight text-charcoal-900">
          Novo post
        </h1>
        <p className="mt-0.5 text-sm text-charcoal-900/60">
          Monte o post e adicione ao lote de aprovação do cliente.
        </p>
      </div>

      <NovoPost
        projectId={id}
        projectName={project.name}
        groups={groups ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hasClickupFolder={!!(project as any).clickup_folder_id}
      />
    </main>
  );
}
