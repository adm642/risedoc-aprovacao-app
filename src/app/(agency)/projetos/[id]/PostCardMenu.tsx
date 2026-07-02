"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deletePost } from "./actions";

export default function PostCardMenu({
  postId,
  projectId,
  title,
}: {
  postId: string;
  projectId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function doDelete() {
    setBusy(true);
    const res = await deletePost({ postId, projectId });
    setBusy(false);
    if ("error" in res) {
      setConfirming(false);
      setOpen(false);
      alert(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div ref={ref} className="absolute right-2 top-2 z-20">
      <button
        type="button"
        aria-label="Opções do post"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
          setConfirming(false);
        }}
        className="grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
      >
        <MoreHorizontal size={16} strokeWidth={1.5} aria-hidden />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-40 overflow-hidden rounded-xl border border-neutral-100 bg-white py-1 text-charcoal-900 shadow-lg"
          onClick={(e) => e.preventDefault()}
        >
          {!confirming ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/posts/${postId}?edit=1`);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-neutral-50"
              >
                <Pencil size={14} strokeWidth={1.5} aria-hidden />
                Editar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirming(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-status-danger hover:bg-status-danger/5"
              >
                <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                Excluir
              </button>
            </>
          ) : (
            <div className="px-3 py-2">
              <p className="mb-2 text-xs text-charcoal-900/70">
                Excluir <b>{title}</b>?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    doDelete();
                  }}
                  className="flex-1 rounded-md bg-status-danger px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "..." : "Excluir"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirming(false);
                  }}
                  className="flex-1 rounded-md border border-neutral-100 px-2 py-1.5 text-xs font-semibold text-charcoal-900"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
