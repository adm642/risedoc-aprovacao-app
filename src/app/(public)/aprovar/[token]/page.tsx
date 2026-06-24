import { getApprovalData } from "@/lib/public-approval";
import ApprovalFlow from "./ApprovalFlow";

/**
 * Página de aprovação do cliente (link público, SEM auth).
 * Next.js 16: `params` é uma Promise.
 */
export default async function AprovarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getApprovalData(token);

  if (!data || data.posts.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-charcoal-900">
          Link indisponível
        </h1>
        <p className="max-w-sm text-sm text-charcoal-900/60">
          Este link de aprovação não está mais ativo ou não tem posts. Fale com a
          agência para receber um novo.
        </p>
      </main>
    );
  }

  return <ApprovalFlow token={token} data={data} />;
}
