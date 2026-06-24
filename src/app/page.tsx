import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-1">
        <div className="flex flex-col gap-[3px]">
          <span className="h-[3px] w-[18px] rounded bg-brand-500" />
          <span className="h-[3px] w-[18px] rounded bg-brand-500" />
          <span className="h-[3px] w-[18px] rounded bg-brand-500" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-charcoal-900">
          rise<span className="text-brand-500">doc</span>
        </h1>
        <p className="text-sm text-charcoal-900/60">App de Aprovação de Posts</p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-[10px] bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
        >
          Painel da Agência
        </Link>
        <Link
          href="/aprovar/demo"
          className="rounded-[10px] border border-neutral-100 bg-white px-5 py-3 text-sm font-semibold text-charcoal-900 transition-colors hover:border-brand-500 hover:text-brand-900"
        >
          Ver fluxo de aprovação
        </Link>
      </div>

      <p className="text-xs text-charcoal-900/40">
        Fundação (E0) instalada · Next.js 16 + Supabase + Tailwind
      </p>
    </main>
  );
}
