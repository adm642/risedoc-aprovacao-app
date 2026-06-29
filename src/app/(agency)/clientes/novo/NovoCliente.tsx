"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadMedia } from "@/lib/upload";
import { publicMediaUrl } from "@/lib/media";
import { createProject } from "./actions";

const NETWORKS = [
  { v: "instagram", label: "Instagram" },
  { v: "facebook", label: "Facebook" },
  { v: "tiktok", label: "TikTok" },
  { v: "linkedin", label: "LinkedIn" },
  { v: "threads", label: "Threads" },
  { v: "youtube", label: "YouTube" },
  { v: "pinterest", label: "Pinterest" },
  { v: "gmb", label: "Google Meu Negócio" },
] as const;

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export default function NovoCliente() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [networks, setNetworks] = useState<string[]>(["instagram"]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [clickupFolder, setClickupFolder] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Informe o nome do cliente.");
    setErr("");
    setBusy("Criando...");

    let photoUrl: string | undefined;
    if (photo) {
      try {
        setBusy("Enviando a foto...");
        const key = `clients/${crypto.randomUUID()}-${sanitize(photo.name)}`;
        await uploadMedia(photo, key);
        photoUrl = publicMediaUrl(key);
      } catch {
        setBusy("");
        return setErr("Falha ao enviar a foto. Tente outra imagem.");
      }
    }

    setBusy("Criando...");
    const res = await createProject({
      name,
      networks,
      photoUrl,
      clickupFolder: clickupFolder || undefined,
    });
    if ("error" in res) {
      setBusy("");
      return setErr(res.error);
    }
    setOk(`Cliente "${name}" criado com sucesso! Redirecionando…`);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  }

  const inputCls =
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:bg-white";
  const labelCls =
    "mb-2 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60";

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <form onSubmit={submit} className="max-w-xl">
      {/* Foto / logo */}
      <div className="mb-5">
        <label className={labelCls}>Foto ou logo do cliente</label>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-900 font-display text-2xl font-bold text-white">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={URL.createObjectURL(photo)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-charcoal-900/60 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:font-semibold file:text-white"
            />
            <p className="mt-1 text-[11px] text-charcoal-900/50">
              Opcional. Aparece no painel e no link de aprovação.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <label className={labelCls}>Nome do cliente</label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Dra. Helena Costa"
        />
      </div>

      <div className="mb-5">
        <label className={labelCls}>Plataformas que costuma usar</label>
        <div className="flex flex-wrap gap-2">
          {NETWORKS.map((n) => {
            const on = networks.includes(n.v);
            return (
              <button
                type="button"
                key={n.v}
                onClick={() =>
                  setNetworks((prev) =>
                    prev.includes(n.v) ? prev.filter((x) => x !== n.v) : [...prev, n.v],
                  )
                }
                className={`rounded-full border-[1.5px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                  on
                    ? "border-brand-500 bg-brand-500/10 text-brand-900"
                    : "border-neutral-100 bg-white text-charcoal-900/60"
                }`}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <label className={labelCls}>Pasta do ClickUp (opcional)</label>
        <input
          className={inputCls}
          value={clickupFolder}
          onChange={(e) => setClickupFolder(e.target.value)}
          placeholder="Cole o link da pasta (ou lista) do cliente no ClickUp"
        />
        <p className="mt-1 text-[11px] text-charcoal-900/50">
          Vinculando aqui, ao criar um post você escolhe o card numa lista — sem
          colar o link toda vez.
        </p>
      </div>

      {err && <p className="mb-4 text-sm text-status-danger">{err}</p>}
      {ok && <p className="mb-4 text-sm font-semibold text-status-success">✓ {ok}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-5 py-3 text-[15px] font-semibold text-charcoal-900"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!!busy}
          className="flex-1 rounded-[10px] bg-brand-500 px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          {busy || "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}
