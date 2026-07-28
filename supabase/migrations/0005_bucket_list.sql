-- Bucket list — promises that convert into memories when kept. See
-- docs/agent/codebase-map/bucket-list.md for the full design; the load-bearing
-- decisions are repeated here as comments so the migration is self-explaining.

create table bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,                    -- "see snow together"
  note text,                              -- optional, written when added
  -- A check constraint, not a categories table: two people, a fixed handful
  -- of kinds of promise. Mirrors how memories.type is modelled. Adding a
  -- category later is a one-line `alter constraint`.
  category text not null default 'other'
    check (category in ('travel','food','date','adventure','home','someday','other')),
  status text not null default 'open'
    check (status in ('open','done')),
  position integer not null default 0,    -- manual ordering, oldest-added first
  completed_at date,                      -- date-only, matches memories.occurred_at exactly
  -- The entire goal→memory conversion: link, never copy. Nullable because two
  -- legitimate states have no memory — an open item, and an item completed
  -- without a photo (see completeItem in lib/bucket-list/mutations.ts).
  -- `on delete set null`: purgeMemory() hard-deletes the row (the one
  -- sanctioned hard delete in this app); without this, purging a print still
  -- linked to a promise fails a foreign-key check instead of letting the
  -- promise gracefully fall back to "no photograph".
  memory_id uuid references memories (id) on delete set null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index bucket_list_open_idx on bucket_list_items (position)
  where deleted_at is null and status = 'open';

create trigger bucket_list_items_set_updated_at
  before update on bucket_list_items
  for each row execute function set_updated_at();

alter table bucket_list_items enable row level security;

-- Same shape as every other table's policies: shared two-person book, not
-- per-user-owned data. No delete policy — same as everywhere else, soft
-- delete via deleted_at only.
create policy bucket_list_items_select on bucket_list_items for select using (auth.uid() is not null);
create policy bucket_list_items_insert on bucket_list_items for insert with check (auth.uid() is not null);
create policy bucket_list_items_update on bucket_list_items for update using (auth.uid() is not null) with check (auth.uid() is not null);
