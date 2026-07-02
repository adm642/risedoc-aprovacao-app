"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import Button from "@/components/ui/Button";
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
  // confirmação inline antes de remover (apresentação)
  const [confirmId, setConfirmId] = useState<string | null>(null);

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
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-2.5 text-[15px] outline-none transition-colors focus:border-brand-500 focus:bg-white";
  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60";

  return (
    <div>
      {/* lista de membros */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-white/60 py-12 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/graf-octagons.png"
            alt=""
            aria-hidden
            className="h-12 w-auto select-none opacity-20"
            draggable={false}
          />
          <p className="text-sm text-charcoal-900/55">
            Nenhum membro na equipe ainda.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3.5 last:border-0"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-900 font-display text-sm font-bold text-white">
                {(m.name || m.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-charcoal-900">
                  {m.name || m.email}
                  {m.userId === currentUserId && (
                    <span className="ml-2 text-xs font-normal text-charcoal-900/45">(você)</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 truncate text-xs text-charcoal-900/55">
                  <Mail size={12} strokeWidth={1.5} aria-hidden className="shrink-0" />
                  <span className="truncate">{m.email}</span>
                </div>
              </div>

              <span
                className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  m.role === "admin"
                    ? "bg-brand-500/10 text-brand-900"
                    : "bg-neutral-50 text-charcoal-900/60"
                }`}
              >
                {m.role === "admin" && (
                  <ShieldCheck size={13} strokeWidth={1.5} aria-hidden />
                )}
                {m.role === "admin" ? "Administrador" : "Membro"}
              </span>

              {isAdmin && m.userId !== currentUserId && (
                confirmId === m.userId ? (
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <span className="hidden text-xs text-charcoal-900/60 sm:block">
                      Remover da equipe?
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      className="min-h-10"
                      onClick={() => {
                        setConfirmId(null);
                        remove(m.userId);
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                      Remover
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-10"
                      onClick={() => setConfirmId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(m.userId)}
                    aria-label={`Remover ${m.name || m.email} da equipe`}
                    className="ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-charcoal-900/45 transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                  >
                    <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {err && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-status-danger/25 bg-status-danger/5 px-4 py-3 text-sm text-status-danger"
        >
          <AlertCircle size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
          {err}
        </div>
      )}

      {/* adicionar membro (somente admin) */}
      {isAdmin && (
        <form
          onSubmit={add}
          className="mt-6 max-w-xl rounded-2xl border border-neutral-100 bg-white p-6"
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500/10 text-brand-900">
              <UserPlus size={18} strokeWidth={1.5} aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-charcoal-900">
                Adicionar membro
              </h2>
              <p className="mt-0.5 text-sm text-charcoal-900/60">
                Crie o login do seu time. Compartilhe o e-mail e a senha com a
                pessoa (ela pode usar pra entrar e trabalhar normalmente).
              </p>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="eq-name" className={labelCls}>
                Nome
              </label>
              <input
                id="eq-name"
                className={inputCls}
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="eq-email" className={labelCls}>
                E-mail
              </label>
              <input
                id="eq-email"
                className={inputCls}
                type="email"
                placeholder="pessoa@agencia.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="eq-password" className={labelCls}>
                Senha provisória
              </label>
              <input
                id="eq-password"
                className={inputCls}
                type="text"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="eq-role" className={labelCls}>
                Papel
              </label>
              <select
                id="eq-role"
                className={inputCls}
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "member")}
              >
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          {ok && (
            <div
              role="status"
              className="mb-3 flex items-start gap-2.5 rounded-[10px] border border-status-success/25 bg-status-success/5 px-4 py-3 text-sm text-status-success-ink"
            >
              <CheckCircle2 size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
              {ok}
            </div>
          )}

          <Button type="submit" disabled={busy} className="mt-1">
            {busy ? (
              <>
                <Loader2 size={16} strokeWidth={2} aria-hidden className="animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <UserPlus size={16} strokeWidth={1.5} aria-hidden />
                Criar membro
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
