"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Verifica que o chamador está logado e é admin da agência. */
async function requireAdmin() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: m } = await sb
    .from("agency_members")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!m || m.role !== "admin") return null;
  return { agencyId: m.agency_id as string, userId: user.id };
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(180),
  password: z.string().min(6).max(72),
  role: z.enum(["admin", "member"]),
});

export async function createTeamMember(
  input: z.input<typeof createSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Preencha nome, e-mail e senha (mínimo 6 caracteres)." };
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Apenas administradores podem adicionar membros." };

  const svc = createSupabaseServiceClient();

  let userId: string | undefined;
  const created = await svc.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.name },
  });

  if (created.error) {
    if (/regist|already|exists/i.test(created.error.message)) {
      const { data: list } = await svc.auth.admin.listUsers();
      userId = list?.users.find(
        (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
      )?.id;
      if (!userId) return { error: "E-mail já usado em outra conta." };
    } else {
      return { error: created.error.message };
    }
  } else {
    userId = created.data.user.id;
  }

  const { error } = await svc.from("agency_members").upsert(
    { agency_id: ctx.agencyId, user_id: userId, role: parsed.data.role },
    { onConflict: "agency_id,user_id" },
  );
  if (error) return { error: "Não foi possível vincular o membro." };

  revalidatePath("/equipe");
  return { ok: true };
}

export async function removeTeamMember(input: {
  userId: string;
}): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Apenas administradores podem remover membros." };
  if (ctx.userId === input.userId)
    return { error: "Você não pode remover a si mesmo." };

  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from("agency_members")
    .delete()
    .eq("agency_id", ctx.agencyId)
    .eq("user_id", input.userId);
  if (error) return { error: "Não foi possível remover o membro." };

  revalidatePath("/equipe");
  return { ok: true };
}
