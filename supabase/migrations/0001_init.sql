-- The Book of Us — initial schema
-- Design notes live in docs/agent/CODEBASE_MAP.md ("Key invariants"). In short:
-- one flexible `memories` table (not one table per media type), soft delete
-- everywhere via deleted_at, and no DELETE grants — hard deletes only ever
-- happen via a service-role script (scripts/backup-export.ts's companion).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- relationship: singleton settings row. The boolean primary key + check
-- constraint is a standard Postgres trick to guarantee at most one row ever
-- exists, without a separate "is there already a row" check in application code.
-- ---------------------------------------------------------------------------
create table relationship (
  id boolean primary key default true check (id),
  started_at date not null,
  partner_a_name text not null,
  partner_b_name text not null,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chapters: one per month, but slug/month are independent of "creation order"
-- so a chapter for a past month can be authored later without renumbering.
-- ---------------------------------------------------------------------------
create table chapters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  month date not null unique, -- always first-of-month, enforced by application
  atmosphere jsonb not null default '{}',
  cover_memory_id uuid, -- FK added after memories exists, see below
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- memories: every photo, video, voice note, letter, chat screenshot, song,
-- location, milestone, or small text moment. `type` discriminates; `meta`
-- carries type-specific, mostly-sparse fields (width/height, duration, city,
-- country, artist, ...) so we never need a wide table of mostly-null columns.
-- `unlock_at` makes *any* memory a potential time capsule, not just letters.
-- ---------------------------------------------------------------------------
create table memories (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters (id), -- nullable: some milestones predate any chapter
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
  deleted_at timestamptz
);

alter table chapters
  add constraint chapters_cover_memory_id_fkey
  foreign key (cover_memory_id) references memories (id);

create index memories_chapter_id_idx on memories (chapter_id) where deleted_at is null;
create index memories_unlock_at_idx on memories (unlock_at) where unlock_at is not null;
create index memories_occurred_at_idx on memories (occurred_at);
create index chapters_month_idx on chapters (month) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger relationship_set_updated_at
  before update on relationship
  for each row execute function set_updated_at();

create trigger chapters_set_updated_at
  before update on chapters
  for each row execute function set_updated_at();

create trigger memories_set_updated_at
  before update on memories
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security. This is a two-person shared book, not per-user data —
-- both partner accounts see and edit everything. Deliberately no DELETE
-- policy on any table: with RLS enabled and no matching policy, DELETE is
-- denied outright for the app's role. Hard deletes only ever happen via a
-- service-role connection (see scripts/backup-export.ts).
-- ---------------------------------------------------------------------------
alter table relationship enable row level security;
alter table chapters enable row level security;
alter table memories enable row level security;

create policy relationship_select on relationship for select using (auth.uid() is not null);
create policy relationship_insert on relationship for insert with check (auth.uid() is not null);
create policy relationship_update on relationship for update using (auth.uid() is not null) with check (auth.uid() is not null);

create policy chapters_select on chapters for select using (auth.uid() is not null);
create policy chapters_insert on chapters for insert with check (auth.uid() is not null);
create policy chapters_update on chapters for update using (auth.uid() is not null) with check (auth.uid() is not null);

create policy memories_select on memories for select using (auth.uid() is not null);
create policy memories_insert on memories for insert with check (auth.uid() is not null);
create policy memories_update on memories for update using (auth.uid() is not null) with check (auth.uid() is not null);
