"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NETWORKS = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "threads",
  "youtube",
  "pinterest",
  "gmb",
] as const;

const schema = z.object({
  name: z.string().min(1).max(160),
  networks: z.array(z.enum(NETWORKS)).default([]),
});

export async function createProject(
  input: { name: string; networks: string[] },
): Promise<{ ok: true; projectId: string } | { error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Informe o nome do cliente." };

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: member } = await sb
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: "Sua conta não está vinculada a uma agência." };

  const { data: project, error } = await sb
    .from("projects")
    .insert({ agency_id: member.agency_id, name: parsed.data.name })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível criar o cliente." };

  if (parsed.data.networks.length > 0) {
    await sb.from("project_networks").insert(
      parsed.data.networks.map((n) => ({ project_id: project.id, network: n })),
    );
  }

  return { ok: true, projectId: project.id };
}
