"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/equipe", label: "Equipe", Icon: Users },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const sb = createSupabaseBrowserClient();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-[232px] flex-col gap-1 border-r border-neutral-100 bg-white p-4">
      <Link href="/dashboard" className="flex items-center px-2 pb-5 pt-2">
        <Logo variant="flat" height={26} />
      </Link>

      {NAV.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-500/10 font-semibold text-brand-900"
                : "text-charcoal-900/60 hover:bg-neutral-50 hover:text-charcoal-900"
            }`}
          >
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500"
              />
            )}
            <Icon size={18} strokeWidth={1.5} aria-hidden className="shrink-0" />
            {label}
          </Link>
        );
      })}

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 border-t border-neutral-100 px-2 pt-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-900 text-xs font-bold text-white">
          {email.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-charcoal-900/70">{email}</div>
          <button
            onClick={logout}
            className="text-xs font-semibold text-brand-900 hover:underline"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
