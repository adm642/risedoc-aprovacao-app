"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleFeedbackResolved } from "./actions";

export default function FeedbackResolveToggle({
  feedbackId,
  postId,
  initialResolved,
}: {
  feedbackId: string;
  postId: string;
  initialResolved: boolean;
}) {
  const router = useRouter();
  const [resolved, setResolved] = useState(initialResolved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !resolved;
    setBusy(true);
    setResolved(next); // otimista
    const res = await toggleFeedbackResolved({ feedbackId, postId, resolved: next });
    setBusy(false);
    if ("error" in res) {
      setResolved(!next); // reverte em erro
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
        resolved
          ? "bg-status-success/15 text-status-success"
          : "border border-neutral-100 bg-white text-charcoal-900/60 hover:border-status-success hover:text-status-success"
      }`}
    >
      {resolved ? "✓ Ajuste resolvido" : "Marcar como resolvido"}
    </button>
  );
}
