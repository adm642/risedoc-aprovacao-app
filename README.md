# Risedoc — App de Aprovação de Posts

SaaS de aprovação de posts de redes sociais, focado 100% no fluxo de aprovação (sem integração com APIs das redes). Cliente revisa via link público; agência recebe feedback preciso (card do carrossel, momento do Reels) e reenvia após corrigir.

> Documentação de produto/arquitetura: vault Obsidian, pasta `Projetos/` (PRD, Arquitetura, Schema, Specs de UI, Roadmap).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** — Postgres + Auth + Storage + Realtime
- **Resend** — e-mails transacionais
- Deploy: **Vercel**

## Rodando localmente

```bash
# 1. usar Node 20.9+ (projeto testado com Node 24 via nvm)
nvm use

# 2. instalar dependências
npm install

# 3. configurar ambiente
cp .env.example .env.local   # e preencher as chaves (ver guia no vault)

# 4. subir o servidor de desenvolvimento
npm run dev                  # http://localhost:3000
```

## Banco de dados (Supabase)

As migrations estão em `supabase/migrations/`:

- `0001_initial_schema.sql` — tabelas, enums, triggers
- `0002_rls_policies.sql` — Row Level Security (escopo por agência)

Aplicar via SQL Editor do Supabase ou Supabase CLI.

## Estrutura

```
src/
  app/
    (agency)/dashboard/      # painel autenticado da agência
    (public)/aprovar/[token] # fluxo público de aprovação do cliente
  lib/supabase/
    server.ts                # cliente p/ Server Components (RLS por sessão)
    client.ts                # cliente p/ navegador
    service.ts               # service-role (server-only) p/ fluxo público
supabase/migrations/         # SQL do banco
```

## Notas Next.js 16

- `cookies()`, `headers()`, `params`, `searchParams` são **assíncronos** (`await`).
- Turbopack é o padrão (`next dev` / `next build`).
- `middleware` foi renomeado para `proxy` — usar `proxy.ts` ao adicionar renovação de sessão.
