"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadMedia } from "@/lib/upload";
import { addCorrectedMedia, resendForApproval, updateCaption } from "./actions";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export default function ResolvePanel({
  postId,
  projectId,
  targetId,
  initialCaption,
}: {
  postId: string;
  projectId: string;
  targetId: string | null;
  initialCaption: string;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(initialCaption);
  const [captionSaved, setCaptionSaved] = useState(false);
  const [mediaDone, setMediaDone] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const resolved = captionSaved || mediaDone;

  async function saveCaption() {
    if (!targetId) return;
    setErr("");
    setBusy("caption");
    const res = await updateCaption({ postId, targetId, caption });
    setBusy("");
    if ("error" in res) return setErr(res.error);
    setCaptionSaved(true);
    router.refresh();
  }

  async function uploadCorrected() {
    if (files.length === 0) return setErr("Escolha o arquivo corrigido.");
    setErr("");
    try {
      const media: { storageKey: string; type: "image" | "video" }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const key = `${projectId}/${crypto.randomUUID()}-${sanitize(file.name)}`;
        setBusy(`Enviando ${i + 1}/${files.length}...`);
        await uploadMedia(file, key);
        media.push({
          storageKey: key,
          type: file.type.startsWith("video") ? "video" : "image",
        });
      }
      setBusy("salvando");
      const res = await addCorrectedMedia({ postId, media });
      setBusy("");
      if ("error" in res) return setErr(res.error);
      setMediaDone(true);
      router.refresh();
    } catch (e) {
      setBusy("");
      setErr(e instanceof Error ? e.message : "Falha no upload.");
    }
  }

  async function resend() {
    setErr("");
    setBusy("resend");
    const res = await resendForApproval({ postId });
    setBusy("");
    if ("error" in res) return setErr(res.error);
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-[10px] border border-neutral-100 bg-neutral-50 p-4">
      <div className="text-sm font-bold text-charcoal-900">Resolver o ajuste</div>
      <p className="mt-1 text-xs leading-relaxed text-charcoal-900/60">
        Texto e hashtags você edita aqui. Imagem ou vídeo, suba a versão corrigida.
      </p>

      {/* editar legenda */}
      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-charcoal-900/50">
          Legenda {captionSaved && <span className="text-status-success">· atualizada ✓</span>}
        </label>
        <textarea
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            setCaptionSaved(false);
          }}
          className="min-h-[80px] w-full resize-y rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-brand-500"
        />
        <button
          onClick={saveCaption}
          disabled={!!busy || !targetId || caption.trim() === initialCaption.trim()}
          className="mt-2 rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-3 py-1.5 text-xs font-semibold text-brand-900 hover:border-brand-500 disabled:opacity-50"
        >
          {busy === "caption" ? "Salvando..." : "Salvar legenda"}
        </button>
      </div>

      {/* subir material corrigido */}
      <div className="mt-4">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-charcoal-900/50">
          Material corrigido {mediaDone && <span className="text-status-success">· enviado ✓</span>}
        </label>
        <input
          type="file"
          accept="image/*,video/mp4,video/quicktime"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-xs text-charcoal-900/60 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-900"
        />
        {files.length > 0 && (
          <button
            onClick={uploadCorrected}
            disabled={!!busy}
            className="mt-2 rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-3 py-1.5 text-xs font-semibold text-brand-900 hover:border-brand-500 disabled:opacity-50"
          >
            {busy && busy !== "caption" && busy !== "resend" ? busy : "Enviar material corrigido"}
          </button>
        )}
      </div>

      {err && <p className="mt-3 text-xs text-status-danger">{err}</p>}

      {/* reenviar */}
      <div className="mt-4 border-t border-neutral-100 pt-3">
        <button
          onClick={resend}
          disabled={!resolved || !!busy}
          className="w-full rounded-[10px] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
        >
          {busy === "resend" ? "Reenviando..." : "Reenviar para aprovação"}
        </button>
        {!resolved && (
          <p className="mt-1.5 text-center text-[11px] text-charcoal-900/50">
            Edite a legenda ou suba o material corrigido para liberar o reenvio
          </p>
        )}
      </div>
    </div>
  );
}
