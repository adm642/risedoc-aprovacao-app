/**
 * Cria um lote de DEMONSTRAÇÃO no Supabase para validar o fluxo de aprovação.
 * Rodar: node --env-file=.env.local scripts/seed-demo.mjs
 * Idempotente: recria o projeto-demo do zero a cada execução.
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const DEMO_TOKEN = "a1b2c3d4-e5f6-4789-abcd-ef0123456789";
const AGENCY = "Risedoc (demo)";
const PROJECT = "Dra. Helena Costa (demo)";

function die(msg, err) {
  console.error("✗", msg, err?.message || err || "");
  process.exit(1);
}

// 1. Agência (find-or-create)
let { data: agency } = await sb.from("agencies").select("id").eq("name", AGENCY).maybeSingle();
if (!agency) {
  const r = await sb.from("agencies").insert({ name: AGENCY }).select("id").single();
  if (r.error) die("criar agência", r.error);
  agency = r.data;
}

// 2. Projeto — apaga o demo antigo (cascade) e recria limpo
await sb.from("projects").delete().eq("agency_id", agency.id).eq("name", PROJECT);
const projRes = await sb
  .from("projects")
  .insert({ agency_id: agency.id, name: PROJECT })
  .select("id")
  .single();
if (projRes.error) die("criar projeto", projRes.error);
const projectId = projRes.data.id;

// 3. Grupo (lote) com token fixo de demonstração
const grpRes = await sb
  .from("approval_groups")
  .insert({ project_id: projectId, name: "JULHO", status: "awaiting_review", public_token: DEMO_TOKEN })
  .select("id")
  .single();
if (grpRes.error) die("criar grupo", grpRes.error);
const groupId = grpRes.data.id;

// 4. Posts + targets (conteúdo de demonstração — dermatologia)
const POSTS = [
  {
    title: "3 hábitos que envelhecem sua pele", format: "feed",
    caption: "Pequenos hábitos, grande diferença na sua pele a longo prazo. Salva esse post 💚",
    demo: { kicker: "Dermatologia", slides: [
      { h: "3 hábitos que envelhecem sua pele", p: "E você faz pelo menos um deles", bg: "linear-gradient(150deg,#0b4f47,#009E8E)" },
      { h: "1. Dormir de maquiagem", p: "Entope os poros e acelera as linhas finas", bg: "linear-gradient(150deg,#1C1C1E,#3A3A3E)" },
      { h: "Cuide hoje, agradeça depois", p: "Agende sua avaliação", bg: "linear-gradient(150deg,#007A6D,#33C7B8)" },
    ] },
    date: "2026-07-12T12:00:00Z",
  },
  {
    title: "Skincare da manhã em 3 passos", format: "reels",
    caption: "Rotina de manhã sem complicação. Qual passo você esquece? 👇",
    demo: { kicker: "Skincare", duration: 18, slides: [
      { h: "Skincare da manhã em 3 passos", p: "Simples, rápido e funciona", bg: "linear-gradient(150deg,#009E8E,#00B5A3)" },
    ] },
    date: "2026-07-15T21:30:00Z",
  },
  {
    title: "Protetor solar só na praia?", format: "feed",
    caption: "O sol da janela e da tela também conta. Protetor é todo dia, faça chuva ou faça sol ☀️",
    demo: { kicker: "Mito ou verdade", slides: [
      { h: "Protetor solar só na praia?", p: "Mito. Use todos os dias.", bg: "linear-gradient(150deg,#1C1C1E,#007A6D)" },
    ] },
    date: "2026-07-18T15:00:00Z",
  },
  {
    title: "Sua pele descama no inverno?", format: "feed",
    caption: "Inverno chegando e a pele pede reforço. Hidratante na pele úmida potencializa o efeito 💧",
    demo: { kicker: "Dica", slides: [
      { h: "Sua pele descama no inverno?", p: "Veja o que fazer", bg: "linear-gradient(150deg,#0b4f47,#33C7B8)" },
      { h: "Hidrate com a pele úmida", p: "Logo após o banho", bg: "linear-gradient(150deg,#2A2A2D,#009E8E)" },
    ] },
    date: "2026-07-22T12:00:00Z",
  },
  {
    title: "Autoestima também é saúde", format: "feed",
    caption: "Se sentir bem com a própria pele muda o seu dia. E isso é cuidado de verdade ✨",
    demo: { kicker: "Frase", slides: [
      { h: "Autoestima também é saúde", p: "", bg: "linear-gradient(150deg,#009E8E,#007A6D)" },
    ] },
    date: "2026-07-31T21:00:00Z",
  },
];

let n = 0;
for (const p of POSTS) {
  const postRes = await sb
    .from("posts")
    .insert({ project_id: projectId, group_id: groupId, internal_title: p.title, status: "awaiting_review", suggested_publish_at: p.date })
    .select("id")
    .single();
  if (postRes.error) die("criar post", postRes.error);
  const tRes = await sb.from("post_targets").insert({
    post_id: postRes.data.id, network: "instagram", format: p.format, caption: p.caption, settings: { demo: p.demo },
  });
  if (tRes.error) die("criar target", tRes.error);
  n++;
}

console.log("✓ Lote de demonstração criado:");
console.log("  Agência:", AGENCY);
console.log("  Projeto:", PROJECT);
console.log("  Posts:", n);
console.log("  Link de aprovação: /aprovar/" + DEMO_TOKEN);
