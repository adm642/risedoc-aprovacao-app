"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const sb = createSupabaseBrowserClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setErr("E-mail ou senha incorretos.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm"
      >
        <div className="mb-7 flex flex-col items-center gap-1">
          <div className="flex flex-col gap-[3px]">
            <span className="h-[3px] w-[18px] rounded bg-brand-500" />
            <span className="h-[3px] w-[18px] rounded bg-brand-500" />
            <span className="h-[3px] w-[18px] rounded bg-brand-500" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-charcoal-900">
            rise<span className="text-brand-500">doc</span>
          </h1>
          <p className="text-sm text-charcoal-900/60">Painel da agência</p>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:bg-white"
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60">
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-5 w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:bg-white"
        />

        {err && <p className="mb-4 text-sm text-status-danger">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[10px] bg-brand-500 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
        >
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
