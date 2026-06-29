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
 * Interpreta um link/ID de container do ClickUp (pasta ou lista).
 * Retorna a referência normalizada "folder:<id>" / "list:<id>", ou null.
 * Ex: .../v/o/f/90112233/.. -> "folder:90112233"
 *     .../v/li/901100445566 -> "list:901100445566"
 */
export function parseClickupContainer(input: string): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  let m = s.match(/\/f\/(\d+)/);
  if (m) return `folder:${m[1]}`;
  m = s.match(/\/(?:li|l)\/(\d+)/);
  if (m) return `list:${m[1]}`;
  // valores crus
  if (/^folder:\d+$/.test(s) || /^list:\d+$/.test(s)) return s;
  if (/^\d+$/.test(s)) return `folder:${s}`; // assume pasta
  return null;
}

export type ClickupCard = {
  id: string;
  name: string;
  listName: string;
  status: string | null;
};

/**
 * Lista os cards (tasks) de um container do ClickUp para o seletor de card.
 * Aceita ref "folder:<id>" (varre as listas da pasta) ou "list:<id>".
 * Best-effort: retorna [] em qualquer falha.
 */
export async function listClickupCards(ref: string): Promise<ClickupCard[]> {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return [];
  const headers = { Authorization: token };

  try {
    const [kind, id] = ref.split(":");
    let listIds: { id: string; name: string }[] = [];

    if (kind === "folder") {
      const r = await fetch(
        `${API}/folder/${encodeURIComponent(id)}/list?archived=false`,
        { headers, cache: "no-store" },
      );
      if (!r.ok) return [];
      const j = await r.json();
      listIds = (j?.lists ?? [])
        .map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))
        .slice(0, 8);
    } else if (kind === "list") {
      listIds = [{ id, name: "" }];
    } else {
      return [];
    }

    const cards: ClickupCard[] = [];
    for (const list of listIds) {
      const tr = await fetch(
        `${API}/list/${encodeURIComponent(list.id)}/task?archived=false&include_closed=false&subtasks=false&page=0`,
        { headers, cache: "no-store" },
      );
      if (!tr.ok) continue;
      const tj = await tr.json();
      for (const t of tj?.tasks ?? []) {
        cards.push({
          id: t.id,
          name: t.name ?? "(sem título)",
          listName: list.name || t?.list?.name || "",
          status: t?.status?.status ?? null,
        });
      }
    }
    return cards;
  } catch {
    return [];
  }
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
