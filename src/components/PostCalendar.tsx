"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_META, statusMeta, type StatusTone } from "@/lib/status-meta";

export type CalendarPost = {
  id: string;
  title: string;
  date: string; // ISO
  status: string;
  thumb?: string | null;
};

/* Cores dos pontos por tom semântico (tokens de globals.css) */
const TONE_DOT: Record<StatusTone, string> = {
  neutral: "#9a9a96",
  info: "#2563eb",
  warning: "#f59e0b",
  success: "#16a34a",
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function PostCalendar({
  posts,
  hrefBase = null,
}: {
  posts: CalendarPost[];
  /** se informado, cada post vira link para `${hrefBase}/${id}` (ex.: "/posts") */
  hrefBase?: string | null;
}) {
  // mês inicial: o do primeiro post futuro, senão o mês atual
  const now = new Date();
  const [view, setView] = useState(() => {
    const dates = posts
      .map((p) => new Date(p.date))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const upcoming = dates.find((d) => d >= new Date(now.getFullYear(), now.getMonth(), 1));
    const base = upcoming ?? dates[0] ?? now;
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  // agrupa posts por dia (yyyy-mm-dd local)
  const byDay = new Map<string, CalendarPost[]>();
  for (const p of posts) {
    const d = new Date(p.date);
    if (isNaN(d.getTime())) continue;
    const k = ymd(d);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(p);
  }

  const first = new Date(view.y, view.m, 1);
  const startOffset = first.getDay(); // 0 = domingo
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const todayKey = ymd(now);

  // monta as células (com vazios antes do dia 1)
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => shift(-1)}
          aria-label="Mês anterior"
          className="grid h-10 w-10 place-items-center rounded-full border border-neutral-100 bg-white text-charcoal-900 hover:border-brand-500"
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <div className="min-w-[180px] text-center font-display text-lg font-bold text-charcoal-900">
          {MONTHS[view.m]} {view.y}
        </div>
        <button
          onClick={() => shift(1)}
          aria-label="Próximo mês"
          className="grid h-10 w-10 place-items-center rounded-full border border-neutral-100 bg-white text-charcoal-900 hover:border-brand-500"
        >
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => setView({ y: now.getFullYear(), m: now.getMonth() })}
          className="ml-auto rounded-[10px] border border-neutral-100 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-900 hover:border-brand-500"
        >
          Hoje
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-neutral-100 bg-neutral-100">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-neutral-50 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-charcoal-900/50"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null)
            return <div key={`e${i}`} className="min-h-[92px] bg-white/40" />;
          const key = ymd(new Date(view.y, view.m, day));
          const dayPosts = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={key} className="min-h-[92px] bg-white p-1.5">
              <div
                className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                  isToday ? "bg-brand-500 text-white" : "text-charcoal-900/60"
                }`}
              >
                {day}
              </div>
              <div className="flex flex-col gap-1">
                {dayPosts.map((p) => {
                  const st = statusMeta(p.status);
                  const inner = (
                    <div className="flex items-center gap-1.5 rounded-md bg-neutral-50 px-1.5 py-1">
                      {p.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumb}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: TONE_DOT[st.tone] }}
                        />
                      )}
                      <span className="truncate text-[11px] font-medium text-charcoal-900/80">
                        {p.title}
                      </span>
                    </div>
                  );
                  return hrefBase ? (
                    <Link key={p.id} href={`${hrefBase}/${p.id}`} className="block hover:opacity-80">
                      {inner}
                    </Link>
                  ) : (
                    <div key={p.id}>{inner}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-charcoal-900/55">
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: TONE_DOT[v.tone] }}
            />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  );
}
