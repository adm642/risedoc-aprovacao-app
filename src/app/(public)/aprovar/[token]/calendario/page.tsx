import Link from "next/link";
import { getClientCalendar } from "@/lib/public-approval";
import PostCalendar from "@/components/PostCalendar";

export default async function CalendarioPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getClientCalendar(token);

  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-charcoal-900">
          Calendário indisponível
        </h1>
        <p className="max-w-sm text-sm text-charcoal-900/60">
          Este link não está mais ativo. Fale com a agência.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        {data.clientPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.clientPhoto}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-900 font-display text-xl font-bold text-white">
            {(data.clientName || "?").charAt(0)}
          </span>
        )}
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-charcoal-900">
            Calendário de publicações
          </h1>
          <p className="text-sm text-charcoal-900/60">
            {data.clientName} · por {data.agencyName}
          </p>
        </div>
      </div>

      {data.items.length === 0 ? (
        <p className="text-sm text-charcoal-900/50">
          Ainda não há posts com data planejada.
        </p>
      ) : (
        <PostCalendar posts={data.items} />
      )}

      <div className="mt-8">
        <Link
          href={`/aprovar/${token}`}
          className="text-sm font-semibold text-brand-900 hover:underline"
        >
          ‹ Voltar para a aprovação
        </Link>
      </div>
    </main>
  );
}
