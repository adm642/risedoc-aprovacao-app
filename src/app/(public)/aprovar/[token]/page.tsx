/**
 * Página de aprovação do cliente (link público, SEM auth).
 * Fluxo: boas-vindas → identificação → revisão post a post → modal pedir ajuste.
 * Ref: Projetos/Spec UI — Página de Aprovação do Cliente (vault)
 *
 * Next.js 16: `params` é uma Promise — precisa de `await`.
 */
export default async function AprovarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="font-display text-2xl font-bold text-charcoal-900">
        Página de aprovação
      </h1>
      <p className="text-sm text-charcoal-900/60">
        Fundação criada. Token do lote: <code>{token}</code>
      </p>
      <p className="text-xs text-charcoal-900/40">
        Em construção — implementar a partir do protótipo aprovado.
      </p>
    </main>
  );
}
