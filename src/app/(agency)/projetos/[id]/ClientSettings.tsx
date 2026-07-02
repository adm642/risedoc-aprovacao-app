"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { uploadMedia } from "@/lib/upload";
import { publicMediaUrl } from "@/lib/media";
import { updateProjectSettings, deleteProject } from "./actions";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export default function ClientSettings({
  projectId,
  photoUrl,
  clickupFolder,
  instagramHandle,
  name,
}: {
  projectId: string;
  photoUrl: string | null;
  clickupFolder: string | null;
  instagramHandle: string | null;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [folder, setFolder] = useState(clickupFolder ?? "");
  const [handle, setHandle] = useState(instagramHandle ?? "");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      instagramHandle: handle.trim() ? handle.trim() : null,
    });
    setBusy("");
    if ("error" in res) return setErr(res.error);
    setOpen(false);
    router.refresh();
  }

  async function doDelete() {
    setErr("");
    setBusy("Excluindo...");
    const res = await deleteProject({ projectId });
    if ("error" in res) {
      setBusy("");
      return setErr(res.error);
    }
    router.push("/dashboard");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:bg-white";
  const labelCls =
    "mb-2 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60";
  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Settings2 size={16} strokeWidth={1.5} aria-hidden />
        Editar cliente
      </Button>

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
              <label className={labelCls}>@ do Instagram</label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-charcoal-900/40">@</span>
                <input
                  className={inputCls}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="drahelenacosta"
                />
              </div>
              <p className="mt-1 text-[11px] text-charcoal-900/50">
                Aparece no topo do preview do post que o cliente revisa.
              </p>
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
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={!!busy}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={!!busy} className="flex-1">
                {busy || "Salvar"}
              </Button>
            </div>

            {/* Zona de perigo — excluir cliente */}
            <div className="mt-5 border-t border-neutral-100 pt-4">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    setErr("");
                    setConfirmDelete(true);
                  }}
                  className="text-sm font-semibold text-status-danger hover:underline"
                >
                  Excluir cliente
                </button>
              ) : (
                <div className="rounded-[10px] border border-status-danger/30 bg-status-danger/5 p-3">
                  <p className="text-xs text-charcoal-900/75">
                    Excluir <b>{name}</b>? Ele some do painel. Posts, lotes e
                    histórico ficam guardados (recuperável), e os links de
                    aprovação deixam de funcionar.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={doDelete}
                      disabled={!!busy}
                      className="rounded-md bg-status-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {busy || "Excluir cliente"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={!!busy}
                      className="rounded-md border border-neutral-100 px-3 py-1.5 text-xs font-semibold text-charcoal-900"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
