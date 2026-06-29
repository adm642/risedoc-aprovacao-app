"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadMedia } from "@/lib/upload";
import { publicMediaUrl } from "@/lib/media";
import { updateProjectSettings } from "./actions";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export default function ClientSettings({
  projectId,
  photoUrl,
  clickupFolder,
  name,
}: {
  projectId: string;
  photoUrl: string | null;
  clickupFolder: string | null;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [folder, setFolder] = useState(clickupFolder ?? "");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  function pick(file: File | null) {
    setPhoto(file);
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function save() {
    setErr("");
    setBusy("Salvando...");
    let newPhotoUrl: string | undefined;
    if (photo) {
      try {
        setBusy("Enviando a foto...");
        const key = `clients/${crypto.randomUUID()}-${sanitize(photo.name)}`;
        await uploadMedia(photo, key);
        newPhotoUrl = publicMediaUrl(key);
      } catch {
        setBusy("");
        return setErr("Falha ao enviar a foto.");
      }
    }
    setBusy("Salvando...");
    const res = await updateProjectSettings({
      projectId,
      ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
      clickupFolder: folder.trim() ? folder.trim() : null,
    });
    setBusy("");
    if ("error" in res) return setErr(res.error);
    setOpen(false);
    router.refresh();
  }

  const inputCls =
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:bg-white";
  const labelCls =
    "mb-2 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60";
  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal-900 transition-colors hover:border-brand-500/40"
      >
        Editar cliente
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-lg font-bold text-charcoal-900">
              Editar cliente
            </h2>

            <div className="mb-5">
              <label className={labelCls}>Foto ou logo</label>
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-900 font-display text-2xl font-bold text-white">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => pick(e.target.files?.[0] ?? null)}
                  className="block flex-1 text-sm text-charcoal-900/60 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:font-semibold file:text-white"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className={labelCls}>Pasta do ClickUp</label>
              <input
                className={inputCls}
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="Cole o link da pasta (ou lista) do cliente"
              />
              <p className="mt-1 text-[11px] text-charcoal-900/50">
                Vinculando aqui, ao criar um post você escolhe o card numa lista.
              </p>
            </div>

            {err && <p className="mb-3 text-sm text-status-danger">{err}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={!!busy}
                className="rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!!busy}
                className="flex-1 rounded-[10px] bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
              >
                {busy || "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
