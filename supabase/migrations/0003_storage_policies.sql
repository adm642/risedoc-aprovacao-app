-- =====================================================================
-- Storage: permissões do bucket "media"
-- Bucket é público (leitura via URL pública). Upload/edição: só autenticado.
-- =====================================================================
begin;

drop policy if exists "media_auth_insert" on storage.objects;
create policy "media_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media');

drop policy if exists "media_auth_update" on storage.objects;
create policy "media_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media');

drop policy if exists "media_auth_delete" on storage.objects;
create policy "media_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media');

-- Permite a agência registrar eventos de histórico nos próprios posts
drop policy if exists events_insert on post_events;
create policy events_insert on post_events
  for insert to authenticated
  with check (
    post_id in (
      select id from posts where project_id in (
        select id from projects where agency_id in (select current_agency_ids())
      )
    )
  );

commit;
