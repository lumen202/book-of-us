-- The demo account's data, isolated from the real book — not by a second
-- Supabase project (that turned out not to be available) but by a second
-- Postgres schema in this same one. Every table below is `0001`–`0010`'s
-- schema again, verbatim, just declared under `demo.` instead of `public.`:
-- same columns, same constraints, same indexes, same triggers, same RLS
-- shape. See docs/agent/codebase-map/demo.md for why this gives the same
-- hard isolation a separate project would (a client opened with
-- `db.schema: "demo"` cannot construct a query against `public.*`, ever) and
-- for the one manual dashboard step this migration can't do itself: adding
-- `demo` to Project Settings → API → Data API Settings → Exposed schemas.
--
-- `public.set_updated_at()` and the `pgcrypto` extension are reused as-is —
-- both resolve from the session's default search_path regardless of which
-- schema the table triggering them lives in, so there's no need for a
-- `demo.set_updated_at()` duplicate.

create schema if not exists demo;

-- ---------------------------------------------------------------------------
-- relationship (0001_init.sql)
-- ---------------------------------------------------------------------------
create table demo.relationship (
  id boolean primary key default true check (id),
  started_at date not null,
  partner_a_name text not null,
  partner_b_name text not null,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chapters (0001_init.sql)
-- ---------------------------------------------------------------------------
create table demo.chapters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  month date not null unique,
  atmosphere jsonb not null default '{}',
  cover_memory_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- memories (0001_init.sql, extended by 0009_bucket_list_album.sql)
-- ---------------------------------------------------------------------------
create table demo.memories (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references demo.chapters (id),
  type text not null check (
    type in ('photo', 'video', 'audio', 'letter', 'chat', 'song', 'location', 'milestone', 'text')
  ),
  title text not null,
  body text,
  occurred_at date not null,
  storage_path text,
  thumbnail_path text,
  meta jsonb not null default '{}',
  unlock_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  bucket_list_item_id uuid -- FK added after bucket_list_items exists, see below
);

alter table demo.chapters
  add constraint chapters_cover_memory_id_fkey
  foreign key (cover_memory_id) references demo.memories (id);

create index demo_memories_chapter_id_idx on demo.memories (chapter_id) where deleted_at is null;
create index demo_memories_unlock_at_idx on demo.memories (unlock_at) where unlock_at is not null;
create index demo_memories_occurred_at_idx on demo.memories (occurred_at);
create index demo_chapters_month_idx on demo.chapters (month) where deleted_at is null;

create trigger relationship_set_updated_at
  before update on demo.relationship
  for each row execute function public.set_updated_at();

create trigger chapters_set_updated_at
  before update on demo.chapters
  for each row execute function public.set_updated_at();

create trigger memories_set_updated_at
  before update on demo.memories
  for each row execute function public.set_updated_at();

alter table demo.relationship enable row level security;
alter table demo.chapters enable row level security;
alter table demo.memories enable row level security;

create policy relationship_select on demo.relationship for select using (auth.uid() is not null);
create policy relationship_insert on demo.relationship for insert with check (auth.uid() is not null);
create policy relationship_update on demo.relationship for update using (auth.uid() is not null) with check (auth.uid() is not null);

create policy chapters_select on demo.chapters for select using (auth.uid() is not null);
create policy chapters_insert on demo.chapters for insert with check (auth.uid() is not null);
create policy chapters_update on demo.chapters for update using (auth.uid() is not null) with check (auth.uid() is not null);

create policy memories_select on demo.memories for select using (auth.uid() is not null);
create policy memories_insert on demo.memories for insert with check (auth.uid() is not null);
create policy memories_update on demo.memories for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- storage (0002_storage.sql) — buckets are project-wide, not schema-scoped,
-- so the demo project gets its own bucket names instead of riding along with
-- the Postgres schema. See lib/supabase/project.ts's resolveBucketName.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('demo-memories', 'demo-memories', false)
on conflict (id) do nothing;

create policy "demo_memories_bucket_select" on storage.objects
  for select using (bucket_id = 'demo-memories' and auth.uid() is not null);

create policy "demo_memories_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'demo-memories' and auth.uid() is not null);

create policy "demo_memories_bucket_update" on storage.objects
  for update using (bucket_id = 'demo-memories' and auth.uid() is not null)
  with check (bucket_id = 'demo-memories' and auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- memory_reactions (0003_reactions.sql)
-- ---------------------------------------------------------------------------
create table demo.memory_reactions (
  memory_id uuid not null references demo.memories (id),
  user_id uuid not null references auth.users (id),
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (memory_id, user_id)
);

create index demo_memory_reactions_memory_id_idx
  on demo.memory_reactions (memory_id) where deleted_at is null;

create trigger memory_reactions_set_updated_at
  before update on demo.memory_reactions
  for each row execute function public.set_updated_at();

alter table demo.memory_reactions enable row level security;

create policy memory_reactions_select on demo.memory_reactions for select using (auth.uid() is not null);
create policy memory_reactions_insert on demo.memory_reactions for insert with check (auth.uid() is not null);
create policy memory_reactions_update on demo.memory_reactions for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- memory_comments (0004_comments.sql)
-- ---------------------------------------------------------------------------
create table demo.memory_comments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references demo.memories (id),
  user_id uuid not null references auth.users (id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index demo_memory_comments_memory_id_idx
  on demo.memory_comments (memory_id) where deleted_at is null;

create trigger memory_comments_set_updated_at
  before update on demo.memory_comments
  for each row execute function public.set_updated_at();

alter table demo.memory_comments enable row level security;

create policy memory_comments_select on demo.memory_comments for select using (auth.uid() is not null);
create policy memory_comments_insert on demo.memory_comments for insert with check (auth.uid() is not null);
create policy memory_comments_update on demo.memory_comments for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- bucket_list_items (0005_bucket_list.sql, extended by 0010's cover_memory_id)
-- ---------------------------------------------------------------------------
create table demo.bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  category text not null default 'other'
    check (category in ('travel','food','date','adventure','home','someday','other')),
  status text not null default 'open'
    check (status in ('open','done')),
  position integer not null default 0,
  completed_at date,
  memory_id uuid references demo.memories (id) on delete set null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  cover_memory_id uuid references demo.memories (id) on delete set null
);

-- Now that bucket_list_items exists, close the loop from demo.memories.
alter table demo.memories
  add constraint memories_bucket_list_item_id_fkey
  foreign key (bucket_list_item_id) references demo.bucket_list_items (id) on delete set null;

create index demo_memories_bucket_list_item_id_idx on demo.memories (bucket_list_item_id)
  where deleted_at is null and bucket_list_item_id is not null;

create index demo_bucket_list_open_idx on demo.bucket_list_items (position)
  where deleted_at is null and status = 'open';

create trigger bucket_list_items_set_updated_at
  before update on demo.bucket_list_items
  for each row execute function public.set_updated_at();

alter table demo.bucket_list_items enable row level security;

create policy bucket_list_items_select on demo.bucket_list_items for select using (auth.uid() is not null);
create policy bucket_list_items_insert on demo.bucket_list_items for insert with check (auth.uid() is not null);
create policy bucket_list_items_update on demo.bucket_list_items for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- vault_items + vault storage bucket (0006_vault.sql)
-- ---------------------------------------------------------------------------
create table demo.vault_items (
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

create index demo_vault_items_created_at_idx on demo.vault_items (created_at) where deleted_at is null;

create trigger vault_items_set_updated_at
  before update on demo.vault_items
  for each row execute function public.set_updated_at();

alter table demo.vault_items enable row level security;

create policy vault_items_select on demo.vault_items for select using (auth.uid() is not null);
create policy vault_items_insert on demo.vault_items for insert with check (auth.uid() is not null);
create policy vault_items_update on demo.vault_items for update using (auth.uid() is not null) with check (auth.uid() is not null);

insert into storage.buckets (id, name, public)
values ('demo-vault', 'demo-vault', false)
on conflict (id) do nothing;

create policy "demo_vault_bucket_select" on storage.objects
  for select using (bucket_id = 'demo-vault' and auth.uid() is not null);

create policy "demo_vault_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'demo-vault' and auth.uid() is not null);

create policy "demo_vault_bucket_update" on storage.objects
  for update using (bucket_id = 'demo-vault' and auth.uid() is not null)
  with check (bucket_id = 'demo-vault' and auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- vault_reactions (0007_vault_reactions.sql)
-- ---------------------------------------------------------------------------
create table demo.vault_reactions (
  vault_item_id uuid not null references demo.vault_items (id),
  user_id uuid not null references auth.users (id),
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (vault_item_id, user_id)
);

create index demo_vault_reactions_vault_item_id_idx
  on demo.vault_reactions (vault_item_id) where deleted_at is null;

create trigger vault_reactions_set_updated_at
  before update on demo.vault_reactions
  for each row execute function public.set_updated_at();

alter table demo.vault_reactions enable row level security;

create policy vault_reactions_select on demo.vault_reactions for select using (auth.uid() is not null);
create policy vault_reactions_insert on demo.vault_reactions for insert with check (auth.uid() is not null);
create policy vault_reactions_update on demo.vault_reactions for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- partner_visits (0008_partner_visits.sql)
-- ---------------------------------------------------------------------------
create table demo.partner_visits (
  id uuid primary key default gen_random_uuid(),
  visited_at timestamptz not null default now()
);

alter table demo.partner_visits enable row level security;

create policy partner_visits_select on demo.partner_visits for select using (auth.uid() is not null);
create policy partner_visits_insert on demo.partner_visits for insert with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- Role grants — a newly created schema has none of these by default. `public`
-- only appears to "just work" because Supabase's template database grants
-- USAGE/CREATE and table/sequence/routine privileges on it to anon,
-- authenticated, and service_role at project creation time; a schema created
-- by hand later doesn't inherit any of that. Without this block, every
-- PostgREST request against demo.* — including from the service-role client
-- (scripts/seed-demo.ts, purgeMemory/purgeVaultItem) — fails with
-- "permission denied for schema demo" even though RLS and the tables
-- themselves are already correct. RLS is still what actually restricts row
-- access (auth.uid() is not null); these grants only unlock the schema/table
-- namespace itself, matching what public already has.
-- ---------------------------------------------------------------------------
grant usage on schema demo to anon, authenticated, service_role;
grant all on all tables in schema demo to anon, authenticated, service_role;
grant all on all sequences in schema demo to anon, authenticated, service_role;
grant all on all routines in schema demo to anon, authenticated, service_role;
alter default privileges in schema demo grant all on tables to anon, authenticated, service_role;
alter default privileges in schema demo grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema demo grant all on routines to anon, authenticated, service_role;
