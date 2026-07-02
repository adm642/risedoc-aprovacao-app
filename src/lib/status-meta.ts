/**
 * Fonte única de verdade dos status de post.
 * Consumida por badges, calendário e telas da agência — labels e tons
 * semânticos ficam definidos em um único lugar.
 */

export type StatusTone = "neutral" | "info" | "warning" | "success";

export type StatusMeta = {
  label: string;
  tone: StatusTone;
};

export const STATUS_META: Record<string, StatusMeta> = {
  draft: { label: "Rascunho", tone: "neutral" },
  awaiting_review: { label: "Aguardando revisão", tone: "info" },
  change_requested: { label: "Pedido de ajuste", tone: "warning" },
  approved: { label: "Aprovado", tone: "success" },
};

/** Metadados do status, com fallback seguro para rascunho. */
export function statusMeta(status: string | null | undefined): StatusMeta {
  return STATUS_META[status ?? ""] ?? STATUS_META.draft;
}
