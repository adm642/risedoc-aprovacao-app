-- =====================================================================
-- App de Aprovação de Posts — Schema inicial
-- Idempotente onde possível. Rodar dentro de transação.
-- Ref: Projetos/Schema de Dados — App de Aprovação de Posts (vault Obsidian)
-- =====================================================================
begin;

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------- Enums ----------
do $$ begin
  create type member_role    as enum ('admin','member');
exception when duplicate_object then null; end $$;
do $$ begin
  create type social_network as enum ('instagram','facebook','tiktok','linkedin','threads','youtube','pinterest','gmb');
exception when duplicate_object then null; end $$;
do $$ begin
  create type post_format     as enum ('feed','reels','story','short','photo');
exception when duplicate_object then null; end $$;
do $$ begin
  create type post_status     as enum ('draft','awaiting_review','change_requested','approved');
exception when duplicate_object then null; end $$;
do $$ begin
  create type group_status    as enum ('draft','awaiting_review','partial','approved');
exception when duplicate_object then null; end $$;
do $$ begin
  create type feedback_type   as enum ('approved','change_request');
exception when duplicate_object then null; end $$;
do $$ begin
  create type media_type      as enum ('image','video');
exception when duplicate_object then null; end $$;

-- ---------- updated_at trigger ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ---------- agencies ----------
create table if not exists agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text,
  brand       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- agency_members ----------
create table if not exists agency_members (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (agency_id, user_id)
);
create index if not exists idx_members_user   on agency_members(user_id);
create index if not exists idx_members_agency on agency_members(agency_id);

-- ---------- projects (clientes) ----------
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  name        text not null,
  photo_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists idx_projects_agency on projects(agency_id) where deleted_at is null;

-- ---------- project_networks ----------
create table if not exists project_networks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  network      social_network not null,
  account_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, network, account_name)
);
create index if not exists idx_networks_project on project_networks(project_id);

-- ---------- approval_groups (lotes) ----------
create table if not exists approval_groups (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  name         text not null,
  status       group_status not null default 'draft',
  public_token uuid not null default gen_random_uuid(),
  created_by   uuid references agency_members(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (public_token)
);
create index if not exists idx_groups_project on approval_groups(project_id);
create index if not exists idx_groups_token   on approval_groups(public_token);

-- ---------- posts ----------
create table if not exists posts (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects(id) on delete cascade,
  group_id             uuid references approval_groups(id) on delete set null,
  internal_title       text,
  status               post_status not null default 'draft',
  suggested_publish_at timestamptz,
  created_by           uuid references agency_members(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);
create index if not exists idx_posts_project on posts(project_id) where deleted_at is null;
create index if not exists idx_posts_group   on posts(group_id)   where deleted_at is null;
create index if not exists idx_posts_status  on posts(status)     where deleted_at is null;

-- ---------- post_media ----------
create table if not exists post_media (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  type        media_type not null,
  storage_key text not null,         -- caminho no Supabase Storage
  thumb_key   text,
  width       int,
  height      int,
  position    int not null default 0,
  version     int not null default 1,         -- incrementa ao subir corrigido
  is_current  boolean not null default true,  -- versão ativa exibida
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_media_post on post_media(post_id);

-- ---------- post_targets (versão por rede) ----------
create table if not exists post_targets (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  network     social_network not null,
  format      post_format not null,
  caption     text,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (post_id, network, format)
);
create index if not exists idx_targets_post on post_targets(post_id);

-- ---------- reviewer_sessions ----------
create table if not exists reviewer_sessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references approval_groups(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_reviewers_group on reviewer_sessions(group_id);

-- ---------- feedbacks ----------
create table if not exists feedbacks (
  id                  uuid primary key default gen_random_uuid(),
  post_id             uuid not null references posts(id) on delete cascade,
  post_target_id      uuid references post_targets(id) on delete set null,
  group_id            uuid not null references approval_groups(id) on delete cascade,
  reviewer_session_id uuid not null references reviewer_sessions(id) on delete cascade,
  type                feedback_type not null,
  categories          text[] not null default '{}',
  slide_indexes       int[]  not null default '{}',   -- carrossel: quais cards (0-based)
  video_timestamps    int[]  not null default '{}',   -- reels: momentos em segundos
  comment             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_feedbacks_post     on feedbacks(post_id);
create index if not exists idx_feedbacks_group    on feedbacks(group_id);
create index if not exists idx_feedbacks_reviewer on feedbacks(reviewer_session_id);

-- ---------- post_events (log/auditoria) ----------
create table if not exists post_events (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references posts(id) on delete cascade,
  actor_member_id   uuid references agency_members(id) on delete set null,
  actor_reviewer_id uuid references reviewer_sessions(id) on delete set null,
  network           social_network,
  event_type        text not null,   -- created|sent_for_review|approved|change_requested|caption_edited|correction_uploaded|resent
  resulting_status  post_status,
  description       text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_events_post on post_events(post_id, created_at);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array[
    'agencies','agency_members','projects','project_networks',
    'approval_groups','posts','post_media','post_targets',
    'reviewer_sessions','feedbacks'
  ] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

commit;
