import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type Slide = { h: string; p?: string; bg: string };

export type ApprovalPost = {
  id: string;
  status: string;
  suggestedAt: string | null;
  network: string;
  format: string;
  caption: string;
  kicker: string;
  duration: number | null;
  slides: Slide[];
};

export type ApprovalData = {
  groupId: string;
  groupName: string;
  agencyName: string;
  posts: ApprovalPost[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Carrega o lote de aprovação a partir do token público.
 * Escopo é garantido pelo token → group_id. Service-role roda só no servidor.
 */
export async function getApprovalData(
  token: string,
): Promise<ApprovalData | null> {
  if (!UUID_RE.test(token)) return null;

  const sb = createSupabaseServiceClient();

  const { data: group } = await sb
    .from("approval_groups")
    .select("id, name, projects ( name, agencies ( name ) )")
    .eq("public_token", token)
    .maybeSingle();

  if (!group) return null;

  const { data: posts } = await sb
    .from("posts")
    .select(
      "id, status, suggested_publish_at, post_targets ( network, format, caption, settings )",
    )
    .eq("group_id", group.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project: any = Array.isArray(group.projects)
    ? group.projects[0]
    : group.projects;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agency: any = Array.isArray(project?.agencies)
    ? project.agencies[0]
    : project?.agencies;

  return {
    groupId: group.id,
    groupName: group.name,
    agencyName: agency?.name ?? "Agência",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posts: (posts ?? []).map((p: any) => {
      const t = Array.isArray(p.post_targets)
        ? p.post_targets[0]
        : p.post_targets;
      const demo = t?.settings?.demo ?? {};
      return {
        id: p.id,
        status: p.status,
        suggestedAt: p.suggested_publish_at,
        network: t?.network ?? "instagram",
        format: t?.format ?? "feed",
        caption: t?.caption ?? "",
        kicker: demo.kicker ?? "",
        duration: demo.duration ?? null,
        slides: demo.slides ?? [{ h: "", bg: "#009E8E" }],
      } satisfies ApprovalPost;
    }),
  };
}
