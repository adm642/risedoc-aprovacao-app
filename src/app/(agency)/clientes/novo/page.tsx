import Link from "next/link";
import NovoCliente from "./NovoCliente";

export default function NovoClientePage() {
  return (
    <main className="px-8 py-7">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-900 hover:underline">
        ‹ Voltar para Dashboard
      </Link>
      <h1 className="mb-1 mt-3 font-display text-2xl font-bold tracking-tight text-charcoal-900">
        Novo cliente
      </h1>
      <p className="mb-6 text-sm text-charcoal-900/60">
        Cadastre o cliente e as plataformas que ele costuma usar.
      </p>
      <NovoCliente />
    </main>
  );
}
