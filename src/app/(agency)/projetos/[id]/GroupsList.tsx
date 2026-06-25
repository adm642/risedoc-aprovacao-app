"use client";

import { useState } from "react";

export type GroupItem = {
  id: string;
  name: string;
  token: string;
  awaiting: number;
  changes: number;
  approved: number;
  total: number;
};

export default function GroupsList({ groups }: { groups: GroupItem[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function linkFor(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/aprovar/${token}`;
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(linkFor(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  }

  function waHref(g: GroupItem) {
    const text = `Olá! Você tem ${g.total} post(s) para revisar no lote "${g.name}". É rápido, acesse: ${linkFor(g.token)}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  function mailHref(g: GroupItem) {
    const subject = `Aprovação de posts — ${g.name}`;
    const body = `Olá!\n\nVocê tem ${g.total} post(s) para revisar.\nAcesse o link de aprovação: ${linkFor(g.token)}\n\nObrigado!`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-charcoal-900/50">
        Nenhum lote ainda. Crie um post e escolha “+ Novo lote” para gerar um.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {groups.map((g) => (
        <div key={g.id} className="rounded-2xl border border-neutral-100 bg-white p-[18px]">
          <div className="flex items-center gap-3">
            <div className="font-display text-base font-bold text-charcoal-900">{g.name}</div>
            <span className="text-xs text-charcoal-900/50">{g.total} post(s)</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {g.awaiting > 0 && (
              <span className="rounded-full bg-status-warning/15 px-2.5 py-1 font-semibold text-[#b4730a]">
                {g.awaiting} aguardando
              </span>
            )}
            {g.changes > 0 && (
              <span className="rounded-full bg-status-warning/15 px-2.5 py-1 font-semibold text-[#b4730a]">
                {g.changes} ajuste(s)
              </span>
            )}
            {g.approved > 0 && (
              <span className="rounded-full bg-status-success/15 px-2.5 py-1 font-semibold text-status-success">
                {g.approved} aprovado(s)
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-neutral-50 px-3 py-2">
            <span className="text-charcoal-900/40">🔗</span>
            <code className="flex-1 truncate text-xs text-charcoal-900/70">
              /aprovar/{g.token}
            </code>
            <button
              onClick={() => copy(g.token)}
              className="rounded-md border border-neutral-100 bg-white px-2.5 py-1 text-xs font-semibold text-brand-900 hover:border-brand-500"
            >
              {copied === g.token ? "Copiado ✓" : "Copiar"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={waHref(g)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[10px] bg-brand-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-400"
            >
              Enviar por WhatsApp
            </a>
            <a
              href={mailHref(g)}
              className="rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-3.5 py-2 text-[13px] font-semibold text-charcoal-900 hover:border-brand-500 hover:text-brand-900"
            >
              E-mail
            </a>
            <a
              href={`/aprovar/${g.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-3.5 py-2 text-[13px] font-semibold text-charcoal-900 hover:border-brand-500 hover:text-brand-900"
            >
              Ver como cliente
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
