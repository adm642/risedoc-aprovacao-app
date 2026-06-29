"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePost } from "./actions";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function EditPostPanel({
  postId,
  targetId,
  initialTitle,
  initialCaption,
  initialSuggestedAt,
  defaultOpen = false,
}: {
  postId: string;
  targetId: string | null;
  initialTitle: string;
  initialCaption: string;
  initialSuggestedAt: string | null;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState(initialTitle);
  const [caption, setCaption] = useState(initialCaption);
  const [suggestedAt, setSuggestedAt] = useState(toLocalInput(initialSuggestedAt));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!title.trim()) return setErr("Dê um título ao post.");
    setErr("");
    setBusy(true);
    const res = await updatePost({
      postId,
      targetId,
      title: title.trim(),
      caption,
      suggestedAt: suggestedAt || undefined,
    });
    setBusy(false);
    if ("error" in res) return setErr(res.error);
    setOpen(false);
    router.refresh();
  }

  const inputCls =
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white";
  const labelCls =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-charcoal-900/55";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-4 py-2 text-sm font-semibold text-charcoal-900 transition-colors hover:border-brand-500/40"
      >
        ✏️ Editar post
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
      <h3 className="mb-3 font-display text-sm font-semibold text-charcoal-900">
        Editar post
      </h3>

      <div className="mb-3">
        <label className={labelCls}>Título interno</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="mb-3">
        <label className={labelCls}>Legenda</label>
        <textarea
          className={`${inputCls} min-h-[90px] resize-y`}
          value={caption}
          maxLength={2200}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className={labelCls}>Data sugerida</label>
        <input
          type="datetime-local"
          className={inputCls}
          value={suggestedAt}
          onChange={(e) => setSuggestedAt(e.target.value)}
        />
      </div>

      {err && <p className="mb-2 text-sm text-status-danger">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-4 py-2 text-sm font-semibold text-charcoal-900"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="flex-1 rounded-[10px] bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          {busy ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
