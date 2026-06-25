-- =====================================================================
-- Marca por feedback: "ajuste resolvido" (resolved_at) + permissão de update
-- =====================================================================
begin;

alter table feedbacks add column if not exists resolved_at timestamptz;

drop policy if exists feedbacks_update on feedbacks;
create policy feedbacks_update on feedbacks
  for update to authenticated
  using (
    group_id in (
      select id from approval_groups where project_id in (
        select id from projects where agency_id in (select current_agency_ids())
      )
    )
  )
  with check (
    group_id in (
      select id from approval_groups where project_id in (
        select id from projects where agency_id in (select current_agency_ids())
      )
    )
  );

commit;
