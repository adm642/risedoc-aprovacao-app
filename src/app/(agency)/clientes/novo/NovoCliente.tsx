"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NovoCliente() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [networks, setNetworks] = useState<string[]>(["instagram"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Informe o nome do cliente.");
    setErr("");
    setBusy(true);
    const res = await createProject({ name, networks });
    setBusy(false);
    if ("error" in res) return setErr(res.error);
    router.push(`/projetos/${res.projectId}`);
    router.refresh();
  }

  const inputCls =
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:bg-white";

  return (
    <form onSubmit={submit} className="max-w-xl">
      <div className="mb-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60">
          Nome do cliente
        </label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Dra. Helena Costa"
        />
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60">
          Plataformas que costuma usar
        </label>
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

      {err && <p className="mb-4 text-sm text-status-danger">{err}</p>}

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
          disabled={busy}
          className="flex-1 rounded-[10px] bg-brand-500 px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          {busy ? "Criando..." : "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}
