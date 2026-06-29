import Link from "next/link";
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
        className="text-sm font-semibold text-brand-900 hover:underline"
      >
        ‹ Voltar para {project.name}
      </Link>
      <h1 className="mb-1 mt-3 font-display text-2xl font-bold tracking-tight text-charcoal-900">
        Novo post
      </h1>
      <p className="mb-6 text-sm text-charcoal-900/60">{project.name}</p>

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
