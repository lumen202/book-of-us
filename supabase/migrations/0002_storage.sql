-- Private storage bucket for all media. One bucket, not one per media type
-- (see docs/agent/codebase-map/data-model.md for the same reasoning applied
-- to the memories table). Path convention:
--   chapters/{chapterId}/{memoryId}/original.{ext}
--   chapters/{chapterId}/{memoryId}/thumb.webp
--
-- No public bucket, ever. Signed URLs are minted server-side per request
-- (see lib/storage/getSignedUrl.ts). RLS on storage.objects mirrors the same
-- "auth.uid() is not null, no delete policy" pattern as the app tables.

insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

create policy "memories_bucket_select" on storage.objects
  for select using (bucket_id = 'memories' and auth.uid() is not null);

create policy "memories_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'memories' and auth.uid() is not null);

create policy "memories_bucket_update" on storage.objects
  for update using (bucket_id = 'memories' and auth.uid() is not null)
  with check (bucket_id = 'memories' and auth.uid() is not null);
