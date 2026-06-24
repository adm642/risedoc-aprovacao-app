-- =====================================================================
-- RLS — lado agência escopado por agência. Lado público: service-role.
-- =====================================================================
begin;

-- Helper: agências do usuário logado
create or replace function current_agency_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select agency_id from agency_members where user_id = auth.uid();
$$;

alter table agencies          enable row level security;
alter table agency_members    enable row level security;
alter table projects          enable row level security;
alter table project_networks  enable row level security;
alter table approval_groups   enable row level security;
alter table posts             enable row level security;
alter table post_media        enable row level security;
alter table post_targets      enable row level security;
alter table reviewer_sessions enable row level security;
alter table feedbacks         enable row level security;
alter table post_events       enable row level security;

create policy agencies_member_select on agencies
  for select using (id in (select current_agency_ids()));

create policy members_select on agency_members
  for select using (agency_id in (select current_agency_ids()));

create policy projects_all on projects
  for all using (agency_id in (select current_agency_ids()))
  with check (agency_id in (select current_agency_ids()));

create policy networks_all on project_networks
  for all using (project_id in (select id from projects where agency_id in (select current_agency_ids())));

create policy groups_all on approval_groups
  for all using (project_id in (select id from projects where agency_id in (select current_agency_ids())));

create policy posts_all on posts
  for all using (project_id in (select id from projects where agency_id in (select current_agency_ids())));

create policy media_all on post_media
  for all using (post_id in (select id from posts where project_id in
    (select id from projects where agency_id in (select current_agency_ids()))));

create policy targets_all on post_targets
  for all using (post_id in (select id from posts where project_id in
    (select id from projects where agency_id in (select current_agency_ids()))));

create policy reviewers_select on reviewer_sessions
  for select using (group_id in (select id from approval_groups where project_id in
    (select id from projects where agency_id in (select current_agency_ids()))));

create policy feedbacks_select on feedbacks
  for select using (group_id in (select id from approval_groups where project_id in
    (select id from projects where agency_id in (select current_agency_ids()))));

create policy events_select on post_events
  for select using (post_id in (select id from posts where project_id in
    (select id from projects where agency_id in (select current_agency_ids()))));

commit;
