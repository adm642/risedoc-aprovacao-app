import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Sidebar from "./Sidebar";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar email={user.email ?? ""} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
