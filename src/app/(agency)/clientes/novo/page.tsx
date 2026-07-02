import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import NovoCliente from "./NovoCliente";

export default function NovoClientePage() {
  return (
    <main className="px-8 py-7">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-900 hover:underline"
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
        Voltar para Dashboard
      </Link>
      <div className="mb-6 mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-900">
          Cadastro
        </div>
        <h1 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-tight text-charcoal-900">
          Novo cliente
        </h1>
        <p className="mt-0.5 text-sm text-charcoal-900/60">
          Cadastre o cliente e as plataformas que ele costuma usar.
        </p>
      </div>
      <NovoCliente />
    </main>
  );
}
