"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  GalleryVertical,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  SquareKanban,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { uploadMedia } from "@/lib/upload";
import { createPost, getClickupCards } from "./actions";
import type { ClickupCard } from "@/lib/clickup";

type Group = { id: string; name: string };

const FORMATS = [
  { v: "feed", label: "Feed (imagem/carrossel)", accept: "image/*", multiple: true },
  { v: "reels", label: "Reels (vídeo)", accept: "video/mp4,video/quicktime", multiple: false },
  { v: "story", label: "Story (imagem)", accept: "image/*", multiple: false },
] as const;

const FORMAT_ICONS = {
  feed: Images,
  reels: Clapperboard,
  story: GalleryVertical,
} as const;

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
    "w-full rounded-[10px] border-[1.5px] border-neutral-100 bg-neutral-50 px-4 py-3 text-[15px] outline-none transition-colors focus:border-brand-500 focus:bg-white";
  const labelCls =
    "mb-2 block text-xs font-semibold uppercase tracking-wide text-charcoal-900/60";

  const MediaIcon = fmt.v === "reels" ? Clapperboard : ImagePlus;

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <div className="mb-6">
        <label htmlFor="np-title" className={labelCls}>
          Título interno
        </label>
        <input
          id="np-title"
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: 3 hábitos que envelhecem a pele"
        />
      </div>

      <div className="mb-6">
        <span className={labelCls}>Formato</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Formato do post">
          {FORMATS.map((f) => {
            const Icon = FORMAT_ICONS[f.v];
            const on = format === f.v;
            return (
              <button
                type="button"
                key={f.v}
                aria-pressed={on}
                onClick={() => {
                  setFormat(f.v);
                  setFiles([]);
                }}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                  on
                    ? "border-brand-500 bg-brand-500/10 text-brand-900"
                    : "border-neutral-100 bg-white text-charcoal-900/60 hover:border-brand-500/40"
                }`}
              >
                <Icon size={15} strokeWidth={1.5} aria-hidden />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <span className={labelCls}>
          Mídia {fmt.multiple ? "(uma ou mais imagens)" : fmt.v === "reels" ? "(um vídeo MP4)" : "(uma imagem)"}
        </span>
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[16px] border-2 border-dashed border-neutral-200 bg-white px-4 py-8 text-center transition-colors hover:border-brand-500/50 hover:bg-brand-500/[0.03] has-[:focus-visible]:border-brand-500"
        >
          <input
            key={format}
            type="file"
            accept={fmt.accept}
            multiple={fmt.multiple}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="sr-only"
          />
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-500/10 text-brand-900">
            <MediaIcon size={20} strokeWidth={1.5} aria-hidden />
          </span>
          <span className="text-sm font-semibold text-charcoal-900">
            {files.length > 0
              ? `${files.length} arquivo(s) selecionado(s) — trocar`
              : fmt.v === "reels"
                ? "Escolher o vídeo"
                : fmt.multiple
                  ? "Escolher as imagens"
                  : "Escolher a imagem"}
          </span>
          <span className="text-xs text-charcoal-900/50">
            {fmt.v === "reels" ? "MP4 ou MOV" : "JPG, PNG ou WebP"}
            {fmt.multiple ? " · a ordem vira o carrossel" : ""}
          </span>
        </label>

        {files.length > 0 && (
          <>
            {files.length > 1 && (
              <p className="mt-3 text-xs text-charcoal-900/55">
                Ordem do carrossel — use as setas para reorganizar:
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="w-[104px] rounded-[10px] border border-neutral-100 bg-white p-1.5"
                >
                  <div className="relative h-24 w-full overflow-hidden rounded-[6px] bg-neutral-50">
                    {f.type.startsWith("image") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-charcoal-900/40">
                        <Film size={24} strokeWidth={1.5} aria-hidden />
                      </div>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-charcoal-900/70 px-1.5 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  {files.length > 1 && (
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={`Mover mídia ${i + 1} para a esquerda`}
                        className="grid h-10 flex-1 place-items-center rounded-[6px] text-brand-900 transition-colors hover:bg-brand-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={i === files.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={`Mover mídia ${i + 1} para a direita`}
                        className="grid h-10 flex-1 place-items-center rounded-[6px] text-brand-900 transition-colors hover:bg-brand-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="np-caption" className={labelCls}>
          Legenda
        </label>
        <textarea
          id="np-caption"
          className={`${inputCls} min-h-[100px] resize-y`}
          value={caption}
          maxLength={2200}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escreva a legenda… use #hashtags"
        />
        <div className="mt-1 text-right text-[11px] tabular-nums text-charcoal-900/50">
          {caption.length}/2200
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-6 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="np-date" className={labelCls}>
            Data sugerida
          </label>
          <div className="relative">
            <Calendar
              size={16}
              strokeWidth={1.5}
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-900/40"
            />
            <input
              id="np-date"
              type="datetime-local"
              className={`${inputCls} pl-11`}
              value={suggestedAt}
              onChange={(e) => setSuggestedAt(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1">
          <label htmlFor="np-group" className={labelCls}>
            Lote de aprovação
          </label>
          <select
            id="np-group"
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
              aria-label="Nome do novo lote"
              className={`${inputCls} mt-2`}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome do lote (ex.: AGOSTO)"
            />
          )}
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="np-clickup" className={labelCls}>
          Card no ClickUp (opcional)
        </label>

        {hasClickupFolder && !pasteMode ? (
          <>
            {loadingCards ? (
              <div
                className={`${inputCls} flex items-center gap-2.5 text-charcoal-900/50`}
                role="status"
              >
                <Loader2 size={16} strokeWidth={1.5} aria-hidden className="animate-spin text-brand-500" />
                Carregando cards do ClickUp…
              </div>
            ) : (cards ?? []).length > 0 ? (
              <div className="relative">
                <SquareKanban
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-900/40"
                />
                <select
                  id="np-clickup"
                  className={`${inputCls} pl-11`}
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
              </div>
            ) : (
              <div className={`${inputCls} text-charcoal-900/50`}>
                Nenhum card encontrado na pasta vinculada.
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-charcoal-900/50">
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
            <div className="relative">
              <Link2
                size={16}
                strokeWidth={1.5}
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-900/40"
              />
              <input
                id="np-clickup"
                className={`${inputCls} pl-11`}
                value={clickupLink}
                onChange={(e) => setClickupLink(e.target.value)}
                placeholder="Cole o link do card (ex.: app.clickup.com/t/abc123)"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-charcoal-900/50">
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

      {err && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-status-danger/25 bg-status-danger/5 px-4 py-3 text-sm text-status-danger"
        >
          <AlertCircle size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
          {err}
        </div>
      )}

      <div className="flex gap-3 border-t border-neutral-100 pt-6">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => router.push(`/projetos/${projectId}`)}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={!!busy} className="flex-1">
          {busy ? (
            <>
              <Loader2 size={16} strokeWidth={2} aria-hidden className="animate-spin" />
              {busy}
            </>
          ) : (
            `Adicionar ao lote — ${projectName}`
          )}
        </Button>
      </div>
    </form>
  );
}
