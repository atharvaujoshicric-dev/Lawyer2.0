-- ════════════════════════════════════════════════════════════════════════
--  LexDesk SaaS — Migration 004: Storage (firm-namespaced file paths)
--  Run AFTER 003_communication.sql
--
--  Every uploaded file is stored at the path:
--    {firm_id}/{client_id}/{filename}
--  The policies below parse the firm_id out of the storage path itself
--  using storage.foldername(), so a user from Firm B can never read or
--  write into Firm A's folder even if they somehow guessed a file path.
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
  values ('lexdesk-files', 'lexdesk-files', false)
  on conflict (id) do nothing;

drop policy if exists "storage_select" on storage.objects;
create policy "storage_select" on storage.objects for select
  using (
    bucket_id = 'lexdesk-files'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = current_firm_id()::text
  );

drop policy if exists "storage_insert" on storage.objects;
create policy "storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'lexdesk-files'
    and auth.role() = 'authenticated'
    and is_firm_approved()
    and (storage.foldername(name))[1] = current_firm_id()::text
  );

drop policy if exists "storage_delete" on storage.objects;
create policy "storage_delete" on storage.objects for delete
  using (
    bucket_id = 'lexdesk-files'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = current_firm_id()::text
  );
