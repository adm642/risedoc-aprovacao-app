"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { createGroup, renameGroup, deleteGroup } from "./actions";

export type GroupItem = {
  id: string;
  name: string;
  token: string;
  awaiting: number;
  changes: number;
  approved: number;
  total: number;
};

export default function GroupsList({
  groups,
  projectId,
}: {
  groups: GroupItem[];
  projectId: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  // criar
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  // renomear / excluir
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    const res = await createGroup({ projectId, name: newName.trim() });
    setBusy(false);
    if ("error" in res) return alert(res.error);
    setNewName("");
    setCreating(false);
    router.refresh();
  }

  async function doRename(id: string) {
    if (!editName.trim()) return;
    setBusy(true);
    const res = await renameGroup({ groupId: id, projectId, name: editName.trim() });
    setBusy(false);
    if ("error" in res) return alert(res.error);
    setEditingId(null);
    router.refresh();
  }

  async function doDelete(id: string) {
    setBusy(true);
    const res = await deleteGroup({ groupId: id, projectId });
    setBusy(false);
    if ("error" in res) return alert(res.error);
    setConfirmId(null);
    router.refresh();
  }

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

  const createBar = (
    <div className="mb-4">
      {creating ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doCreate()}
            placeholder="Nome do lote (ex.: AGOSTO)"
            className="rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
          />
          <Button onClick={doCreate} disabled={busy || !newName.trim()} size="sm">
            {busy ? "..." : "Criar lote"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-brand-500/40 bg-white px-4 py-2 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-500 hover:bg-brand-500/5"
        >
          <Plus size={15} strokeWidth={1.5} aria-hidden />
          Novo lote
        </button>
      )}
    </div>
  );

  if (groups.length === 0) {
    return (
      <div>
        {createBar}
        <p className="text-sm text-charcoal-900/50">
          Nenhum lote ainda. Crie um lote acima (ou ele é criado ao adicionar um post).
        </p>
      </div>
    );
  }

  return (
    <div>
      {createBar}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {groups.map((g) => (
        <div key={g.id} className="rounded-2xl border border-neutral-100 bg-white p-[18px]">
          <div className="flex items-center gap-3">
            {editingId === g.id ? (
              <>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doRename(g.id)}
                  className="flex-1 rounded-md border-[1.5px] border-neutral-100 bg-neutral-50 px-2.5 py-1 text-sm font-semibold outline-none focus:border-brand-500 focus:bg-white"
                />
                <button
                  onClick={() => doRename(g.id)}
                  disabled={busy}
                  className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs font-semibold text-charcoal-900/50"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <div className="font-display text-base font-bold text-charcoal-900">{g.name}</div>
                <span className="text-xs text-charcoal-900/50">{g.total} post(s)</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingId(g.id);
                      setEditName(g.name);
                    }}
                    aria-label="Renomear lote"
                    title="Renomear"
                    className="grid h-7 w-7 place-items-center rounded-md text-charcoal-900/40 hover:bg-neutral-50 hover:text-charcoal-900"
                  >
                    <Pencil size={14} strokeWidth={1.5} aria-hidden />
                  </button>
                  <button
                    onClick={() => setConfirmId(g.id)}
                    aria-label="Excluir lote"
                    title="Excluir"
                    className="grid h-7 w-7 place-items-center rounded-md text-charcoal-900/40 hover:bg-status-danger/10 hover:text-status-danger"
                  >
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                  </button>
                </div>
              </>
            )}
          </div>

          {confirmId === g.id && (
            <div className="mt-3 rounded-[10px] border border-status-danger/30 bg-status-danger/5 p-3">
              <p className="text-xs text-charcoal-900/75">
                Excluir o lote <b>{g.name}</b>?{" "}
                {g.total > 0
                  ? `Os ${g.total} post(s) continuam no projeto, mas o link de aprovação deixa de funcionar.`
                  : "O link de aprovação deixa de funcionar."}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => doDelete(g.id)}
                  disabled={busy}
                  className="rounded-md bg-status-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "..." : "Excluir lote"}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="rounded-md border border-neutral-100 px-3 py-1.5 text-xs font-semibold text-charcoal-900"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {g.awaiting > 0 && (
              <span className="rounded-full bg-status-info/10 px-2.5 py-1 font-semibold text-status-info-ink">
                {g.awaiting} aguardando
              </span>
            )}
            {g.changes > 0 && (
              <span className="rounded-full bg-status-warning/15 px-2.5 py-1 font-semibold text-status-warning-ink">
                {g.changes} ajuste(s)
              </span>
            )}
            {g.approved > 0 && (
              <span className="rounded-full bg-status-success/10 px-2.5 py-1 font-semibold text-status-success-ink">
                {g.approved} aprovado(s)
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-neutral-50 px-3 py-2">
            <Link2 size={14} strokeWidth={1.5} aria-hidden className="shrink-0 text-charcoal-900/40" />
            <code className="flex-1 truncate text-xs text-charcoal-900/70">
              /aprovar/{g.token}
            </code>
            <button
              onClick={() => copy(g.token)}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-100 bg-white px-2.5 py-1 text-xs font-semibold text-brand-900 hover:border-brand-500"
            >
              {copied === g.token ? (
                <>
                  Copiado
                  <Check size={12} strokeWidth={2.25} aria-hidden />
                </>
              ) : (
                "Copiar"
              )}
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
    </div>
  );
}
