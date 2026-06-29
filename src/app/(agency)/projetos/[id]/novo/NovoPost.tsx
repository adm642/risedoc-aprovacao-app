"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadMedia } from "@/lib/upload";
import { createPost, getClickupCards } from "./actions";
import type { ClickupCard } from "@/lib/clickup";

type Group = { id: string; name: string };

const FORMATS = [
  { v: "feed", label: "Feed (imagem/carrossel)", accept: "image/*", multiple: true },
  { v: "reels", label: "Reels (vídeo)", accept: "video/mp4,video/quicktime", multiple: false },
  { v: "story", label: "Story (imagem)", accept: "image/*", multiple: false },
] as const;

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export default function NovoPost({
  projectId,
  projectName,
  groups,
  hasClickupFolder = false,
}: {
  projectId: string;
  projectName: string;
  groups: Group[];
  hasClickupFolder?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<"feed" | "reels" | "story">("feed");
  const [caption, setCaption] = useState("");
  const [suggestedAt, setSuggestedAt] = useState("");
  const [clickupLink, setClickupLink] = useState("");
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "__new__");
  const [newGroupName, setNewGroupName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // Seletor de card do ClickUp (quando o cliente tem pasta vinculada)
  const [cards, setCards] = useState<ClickupCard[] | null>(null);
  const [loadingCards, setLoadingCards] = useState(hasClickupFolder);
  const [pasteMode, setPasteMode] = useState(false);

  useEffect(() => {
    if (!hasClickupFolder) return;
    let alive = true;
    (async () => {
      const res = await getClickupCards(projectId);
      if (!alive) return;
      setCards("cards" in res ? res.cards : []);
      setLoadingCards(false);
    })();
    return () => {
      alive = false;
    };
  }, [hasClickupFolder, projectId]);

  // agrupa cards por lista para o <optgroup>
  const cardsByList = (cards ?? []).reduce<Record<string, ClickupCard[]>>(
    (acc, c) => {
      const k = c.listName || "Cards";
      (acc[k] ??= []).push(c);
      return acc;
    },
    {},
  );

  const fmt = FORMATS.find((f) => f.v === format)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!title.trim()) return setErr("Dê um título ao post.");
    if (files.length === 0) return setErr("Envie ao menos uma mídia.");
    if (groupId === "__new__" && !newGroupName.trim())
      return setErr("Dê um nome ao novo lote.");

    try {
      const media: { type: "image" | "video"; storageKey: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const key = `${projectId}/${crypto.randomUUID()}-${sanitize(file.name)}`;
        setBusy(`Enviando ${i + 1}/${files.length}...`);
        try {
          await uploadMedia(file, key);
        } catch (upErr) {
          setBusy("");
          const msg = upErr instanceof Error ? upErr.message : "erro";
          return setErr(`Falha no upload: ${msg}`);
        }
        media.push({
          type: file.type.startsWith("video") ? "video" : "image",
          storageKey: key,
        });
      }

      setBusy("Salvando post...");
      const res = await createPost({
        projectId,
        groupId: groupId === "__new__" ? null : groupId,
        newGroupName: groupId === "__new__" ? newGroupName : undefined,
        title,
        format,
        caption,
        suggestedAt: suggestedAt || undefined,
        clickupLink: clickupLink || undefined,
        media,
      });
      setBusy("");
      if ("error" in res) return setErr(res.error);

      router.push(`/projetos/${projectId}`);
      router.refresh();
    } catch (e) {
      setBusy("");
      setErr("Algo deu errado. Tente novamente.");
      console.error(e);
    }
  }

  function move(i: number, dir: -1 | 1) {
    setFiles((prev) => {
      const a = [...prev];
      const j = i + dir;
      if (j < 0 || j >= a.length) return prev;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  }

  const inputCls =
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:bg-white";
  const labelCls =
    "mb-2 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60";

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <div className="mb-5">
        <label className={labelCls}>Título interno</label>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: 3 hábitos que envelhecem a pele"
        />
      </div>

      <div className="mb-5">
        <label className={labelCls}>Formato</label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              type="button"
              key={f.v}
              onClick={() => {
                setFormat(f.v);
                setFiles([]);
              }}
              className={`rounded-full border-[1.5px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                format === f.v
                  ? "border-brand-500 bg-brand-500/10 text-brand-900"
                  : "border-neutral-100 bg-white text-charcoal-900/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className={labelCls}>
          Mídia {fmt.multiple ? "(uma ou mais imagens)" : fmt.v === "reels" ? "(um vídeo MP4)" : "(uma imagem)"}
        </label>
        <input
          type="file"
          accept={fmt.accept}
          multiple={fmt.multiple}
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full rounded-[10px] border-2 border-dashed border-neutral-100 bg-neutral-50 px-4 py-6 text-sm text-charcoal-900/60 file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:font-semibold file:text-white"
        />
        {files.length > 0 && (
          <>
            {files.length > 1 && (
              <p className="mt-2 text-xs text-charcoal-900/55">
                Ordem do carrossel — use as setas para reorganizar:
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              {files.map((f, i) => (
                <div key={i} className="w-24 rounded-lg border border-neutral-100 bg-white p-1.5">
                  <div className="relative h-24 w-full overflow-hidden rounded bg-neutral-50">
                    {f.type.startsWith("image") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-2xl">🎬</div>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  {files.length > 1 && (
                    <div className="mt-1 flex justify-between">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        className="rounded px-2 text-sm font-bold text-brand-900 disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={i === files.length - 1}
                        onClick={() => move(i, 1)}
                        className="rounded px-2 text-sm font-bold text-brand-900 disabled:opacity-30"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mb-5">
        <label className={labelCls}>Legenda</label>
        <textarea
          className={`${inputCls} min-h-[100px] resize-y`}
          value={caption}
          maxLength={2200}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escreva a legenda… use #hashtags"
        />
        <div className="mt-1 text-right text-[11px] text-charcoal-900/50">
          {caption.length}/2200
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-5 sm:flex-row">
        <div className="flex-1">
          <label className={labelCls}>Data sugerida</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={suggestedAt}
            onChange={(e) => setSuggestedAt(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Lote de aprovação</label>
          <select
            className={inputCls}
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value="__new__">+ Novo lote…</option>
          </select>
          {groupId === "__new__" && (
            <input
              className={`${inputCls} mt-2`}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome do lote (ex.: AGOSTO)"
            />
          )}
        </div>
      </div>

      <div className="mb-5">
        <label className={labelCls}>Card no ClickUp (opcional)</label>

        {hasClickupFolder && !pasteMode ? (
          <>
            {loadingCards ? (
              <div className={`${inputCls} text-charcoal-900/50`}>
                Carregando cards do ClickUp…
              </div>
            ) : (cards ?? []).length > 0 ? (
              <select
                className={inputCls}
                value={clickupLink}
                onChange={(e) => setClickupLink(e.target.value)}
              >
                <option value="">— Escolha o card deste post —</option>
                {Object.entries(cardsByList).map(([listName, list]) => (
                  <optgroup key={listName} label={listName}>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.status ? ` · ${c.status}` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <div className={`${inputCls} text-charcoal-900/50`}>
                Nenhum card encontrado na pasta vinculada.
              </div>
            )}
            <p className="mt-1 text-[11px] text-charcoal-900/50">
              Cards puxados da pasta do cliente no ClickUp.{" "}
              <button
                type="button"
                onClick={() => {
                  setPasteMode(true);
                  setClickupLink("");
                }}
                className="font-semibold text-brand-900 hover:underline"
              >
                Colar o link manualmente
              </button>
            </p>
          </>
        ) : (
          <>
            <input
              className={inputCls}
              value={clickupLink}
              onChange={(e) => setClickupLink(e.target.value)}
              placeholder="Cole o link do card (ex.: app.clickup.com/t/abc123)"
            />
            <p className="mt-1 text-[11px] text-charcoal-900/50">
              Quando o cliente pedir ajuste neste post, criamos uma subtarefa neste card.
              {hasClickupFolder && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setPasteMode(false)}
                    className="font-semibold text-brand-900 hover:underline"
                  >
                    Escolher da lista
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>

      {err && <p className="mb-4 text-sm text-status-danger">{err}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/projetos/${projectId}`)}
          className="rounded-[10px] border-[1.5px] border-neutral-100 bg-white px-5 py-3 text-[15px] font-semibold text-charcoal-900"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!!busy}
          className="flex-1 rounded-[10px] bg-brand-500 px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          {busy || `Adicionar ao lote — ${projectName}`}
        </button>
      </div>
    </form>
  );
}
