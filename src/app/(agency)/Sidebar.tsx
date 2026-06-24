"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
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
      <Link href="/dashboard" className="flex items-center gap-2 px-2 pb-5 pt-1">
        <span className="flex flex-col gap-[3px]">
          <span className="h-[3px] w-[15px] rounded bg-brand-500" />
          <span className="h-[3px] w-[15px] rounded bg-brand-500" />
          <span className="h-[3px] w-[15px] rounded bg-brand-500" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-charcoal-900">
          rise<span className="text-brand-500">doc</span>
        </span>
      </Link>

      {NAV.map((n) => {
        const active = pathname === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-500/10 font-semibold text-brand-900"
                : "text-charcoal-900/60 hover:bg-neutral-50 hover:text-charcoal-900"
            }`}
          >
            <span className="w-[18px] text-center">{n.icon}</span>
            {n.label}
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
