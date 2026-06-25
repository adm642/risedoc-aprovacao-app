import "server-only";

const API = "https://api.clickup.com/api/v2";

/**
 * Extrai o ID do card a partir de um link do ClickUp (ou aceita o ID cru).
 * Ex: https://app.clickup.com/t/86abc123 -> "86abc123"
 *     https://app.clickup.com/t/{teamId}/{customId} -> "{customId}"
 */
export function parseClickupTaskId(input: string): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  const m = s.match(/\/t\/([^/?#]+)(?:\/([^/?#]+))?/);
  if (m) return (m[2] || m[1]) ?? null;
  // sem "/t/": assume que já é o ID
  return /\s/.test(s) ? null : s;
}

/**
 * Cria uma subtarefa no card informado, com o conteúdo do ajuste.
 * Best-effort: nunca lança — retorna {ok:false} em falha (não bloqueia o feedback).
 */
export async function createClickupSubtask(
  parentTaskId: string,
  name: string,
  description: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return { ok: false, error: "CLICKUP_API_TOKEN ausente" };

  try {
    // 1) descobre a lista do card pai + seus responsáveis
    const tRes = await fetch(`${API}/task/${encodeURIComponent(parentTaskId)}`, {
      headers: { Authorization: token },
      cache: "no-store",
    });
    if (!tRes.ok) return { ok: false, error: `GET task ${tRes.status}` };
    const task = await tRes.json();
    const listId = task?.list?.id;
    if (!listId) return { ok: false, error: "card sem lista" };

    // responsáveis: os mesmos do card principal
    const assignees: number[] = Array.isArray(task?.assignees)
      ? task.assignees.map((a: { id: number }) => a.id).filter(Boolean)
      : [];

    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;

    // 2) cria a subtarefa (responsável, início hoje, vencimento amanhã, urgente)
    const cRes = await fetch(`${API}/list/${listId}/task`, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        parent: parentTaskId,
        assignees,
        priority: 1, // 1 = Urgente
        start_date: now,
        due_date: tomorrow,
      }),
    });
    if (!cRes.ok) {
      const body = (await cRes.text()).slice(0, 200);
      return { ok: false, error: `POST subtask ${cRes.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "erro" };
  }
}
