"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeamMember, removeTeamMember } from "./actions";

export type Member = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

export default function EquipeManager({
  members,
  isAdmin,
  currentUserId,
}: {
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    setBusy(true);
    const res = await createTeamMember({ name, email, password, role });
    setBusy(false);
    if ("error" in res) return setErr(res.error);
    setOk(`Membro ${email} criado. Compartilhe o login com ele.`);
    setName("");
    setEmail("");
    setPassword("");
    setRole("member");
    router.refresh();
  }

  async function remove(userId: string) {
    setErr("");
    const res = await removeTeamMember({ userId });
    if ("error" in res) return setErr(res.error);
    router.refresh();
  }

  const inputCls =
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-2.5 text-[15px] outline-none focus:border-brand-500 focus:bg-white";

  return (
    <div>
      {/* lista de membros */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3.5 last:border-0"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-900 text-xs font-bold text-white">
              {(m.name || m.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-charcoal-900">
                {m.name || m.email}
                {m.userId === currentUserId && (
                  <span className="ml-2 text-xs font-normal text-charcoal-900/45">(você)</span>
                )}
              </div>
              <div className="truncate text-xs text-charcoal-900/55">{m.email}</div>
            </div>
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${
                m.role === "admin"
                  ? "bg-brand-500/10 text-brand-900"
                  : "bg-neutral-50 text-charcoal-900/60"
              }`}
            >
              {m.role === "admin" ? "Administrador" : "Membro"}
            </span>
            {isAdmin && m.userId !== currentUserId && (
              <button
                onClick={() => remove(m.userId)}
                className="ml-2 rounded-md px-2 py-1 text-xs font-semibold text-status-danger hover:bg-status-danger/10"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      {/* adicionar membro (somente admin) */}
      {isAdmin && (
        <form
          onSubmit={add}
          className="mt-6 max-w-xl rounded-2xl border border-neutral-100 bg-white p-5"
        >
          <h2 className="mb-1 font-display text-base font-semibold text-charcoal-900">
            Adicionar membro
          </h2>
          <p className="mb-4 text-sm text-charcoal-900/60">
            Crie o login do seu time. Compartilhe o e-mail e a senha com a pessoa
            (ela pode usar pra entrar e trabalhar normalmente).
          </p>

          <div className="mb-3 flex flex-col gap-3 sm:flex-row">
            <input
              className={inputCls}
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className={inputCls}
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row">
            <input
              className={inputCls}
              type="text"
              placeholder="Senha provisória (mín. 6)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <select
              className={inputCls}
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
            >
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {err && <p className="mb-3 text-sm text-status-danger">{err}</p>}
          {ok && <p className="mb-3 text-sm text-status-success">{ok}</p>}

          <button
            type="submit"
            disabled={busy}
            className="rounded-[10px] bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
          >
            {busy ? "Criando..." : "Criar membro"}
          </button>
        </form>
      )}
    </div>
  );
}
