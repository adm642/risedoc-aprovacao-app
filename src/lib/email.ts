import "server-only";
import { Resend } from "resend";

const FROM =
  process.env.MAIL_FROM || "Risedoc Aprovações <aprovacao@risedoc.com.br>";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export type ReviewSummary = {
  to: string[];
  reviewerName: string;
  clientName: string;
  groupName: string;
  approved: number;
  changes: number;
  total: number;
  link: string;
};

/**
 * Envia um e-mail resumo para a agência quando o cliente termina de revisar
 * um lote. Best-effort: nunca lança — retorna {ok} para registro.
 */
export async function sendReviewSummaryEmail(
  s: ReviewSummary,
): Promise<{ ok: boolean; error?: string }> {
  const resend = client();
  if (!resend) return { ok: false, error: "RESEND_API_KEY ausente" };
  if (s.to.length === 0) return { ok: false, error: "Sem destinatários" };

  const hasChanges = s.changes > 0;
  const subject = hasChanges
    ? `🔧 ${s.clientName} pediu ajustes em ${s.changes} post(s) — ${s.groupName}`
    : `✅ ${s.clientName} aprovou tudo — ${s.groupName}`;

  const accent = hasChanges ? "#b4730a" : "#16A34A";
  const headline = hasChanges
    ? `${s.reviewerName} revisou o lote e pediu ajustes.`
    : `${s.reviewerName} revisou e aprovou todos os posts. 🎉`;

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://app.risedoc.com.br"
  ).replace(/\/$/, "");

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F5F5F0;padding:28px 0;color:#1C1C1E">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #ECECE7">
      <div style="background:#009E8E;padding:18px 24px">
        <img src="${appUrl}/brand/logo-white.png" alt="Risedoc" height="24" style="height:24px;width:auto;display:block" />
      </div>
      <div style="padding:24px">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:#9a9a96;font-weight:700">${s.clientName}</div>
        <h1 style="margin:6px 0 16px;font-size:19px;line-height:1.3;color:#1C1C1E">${headline}</h1>

        <div style="display:flex;gap:10px;margin:16px 0">
          <div style="flex:1;background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.25);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:#16A34A">${s.approved}</div>
            <div style="font-size:11px;color:#1C1C1E;opacity:.7">aprovado(s)</div>
          </div>
          <div style="flex:1;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:#b4730a">${s.changes}</div>
            <div style="font-size:11px;color:#1C1C1E;opacity:.7">com ajuste(s)</div>
          </div>
        </div>

        <p style="font-size:13px;color:#1C1C1E;opacity:.75;margin:0 0 20px">
          Lote <b>${s.groupName}</b> — ${s.total} post(s) no total.
          ${hasChanges ? "Os pedidos de ajuste já estão no painel (e viraram subtarefas no ClickUp)." : ""}
        </p>

        <a href="${s.link}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">
          ${hasChanges ? "Ver os ajustes" : "Ver no painel"}
        </a>
      </div>
      <div style="padding:14px 24px;border-top:1px solid #ECECE7;font-size:11px;color:#b5b5b0">
        Notificação automática do app de aprovações da Risedoc.
      </div>
    </div>
  </div>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: s.to,
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "erro" };
  }
}
