import { statusMeta, type StatusTone } from "@/lib/status-meta";

/**
 * Pílula de status de post. Server-component-safe.
 * Cores vêm dos tokens semânticos de `globals.css` (ink = contraste AA).
 */

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: {
    pill: "bg-charcoal-900/[0.06] text-charcoal-900/65",
    dot: "bg-status-neutral",
  },
  info: { pill: "bg-status-info/10 text-status-info-ink", dot: "bg-status-info" },
  warning: {
    pill: "bg-status-warning/15 text-status-warning-ink",
    dot: "bg-status-warning",
  },
  success: {
    pill: "bg-status-success/10 text-status-success-ink",
    dot: "bg-status-success",
  },
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const meta = statusMeta(status);
  const tone = TONES[meta.tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.pill} ${className}`.trim()}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}

export default StatusBadge;
