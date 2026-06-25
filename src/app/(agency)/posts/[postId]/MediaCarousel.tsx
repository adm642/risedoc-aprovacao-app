"use client";

import { useState } from "react";

export type Media = { type: "image" | "video"; url: string };

export default function MediaCarousel({
  media,
  isReel,
}: {
  media: Media[];
  isReel: boolean;
}) {
  const [i, setI] = useState(0);
  if (media.length === 0) return null;

  const cur = media[Math.min(i, media.length - 1)];
  const multi = media.length > 1;

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden bg-black"
      style={{ aspectRatio: isReel ? "9/16" : "4/5" }}
    >
      {cur.type === "video" ? (
        <video src={cur.url} controls playsInline className="h-full w-full object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cur.url} alt="" className="h-full w-full object-cover" />
      )}

      {multi && (
        <>
          <button
            onClick={() => setI((i - 1 + media.length) % media.length)}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-charcoal-900 shadow"
          >
            ‹
          </button>
          <button
            onClick={() => setI((i + 1) % media.length)}
            aria-label="Próxima"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-charcoal-900 shadow"
          >
            ›
          </button>
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
            {i + 1}/{media.length}
          </span>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((_, j) => (
              <span
                key={j}
                className={`h-1.5 w-1.5 rounded-full ${j === i ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
