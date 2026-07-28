-- The vault: a private photo album, separate from the main book.
--
-- Deliberately its own table and its own storage bucket rather than a `type`
-- on `memories` — vault photos must never appear in a chapter, a search, a
-- time-capsule fetch, or the album export, and giving them their own table
-- makes "never queried by the memories code path" true by construction rather
-- than by a filter someone could forget to add.
--
-- RLS here is identical in shape to every other table in this book (select/
-- insert/update gated on `auth.uid() is not null`, no delete policy — soft
-- delete only, same as `memories`): the password re-entry the app asks for
-- before showing this page is a UX step-up gate, not a stronger data
-- boundary. Both accounts are already fully authenticated against this same
-- database either way, exactly like the rest of the book.

create table vault_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  storage_path text not null,
  thumbnail_path text not null,
  meta jsonb not null default '{}',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index vault_items_created_at_idx on vault_items (created_at) where deleted_at is null;

-- `set_updated_at()` already exists, defined in 0001_init.sql.
create trigger vault_items_set_updated_at
  before update on vault_items
  for each row execute function set_updated_at();

alter table vault_items enable row level security;

create policy vault_items_select on vault_items for select using (auth.uid() is not null);
create policy vault_items_insert on vault_items for insert with check (auth.uid() is not null);
create policy vault_items_update on vault_items for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- Its own private bucket, same shape as 0002_storage.sql's `memories` bucket.
-- Path convention: vault/{itemId}/original.{ext}, vault/{itemId}/thumb.{ext}.
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

create policy "vault_bucket_select" on storage.objects
  for select using (bucket_id = 'vault' and auth.uid() is not null);

create policy "vault_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'vault' and auth.uid() is not null);

create policy "vault_bucket_update" on storage.objects
  for update using (bucket_id = 'vault' and auth.uid() is not null)
  with check (bucket_id = 'vault' and auth.uid() is not null);
