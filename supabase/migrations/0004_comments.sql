-- Notes left on a memory — freeform text, unlike the fixed-vocabulary
-- reactions in 0003. Same shape as every other mutable table: soft delete via
-- deleted_at, RLS with no DELETE policy, updated_at trigger. See
-- docs/agent/codebase-map/data-model.md and the "no hard deletes" invariant
-- in overview.md.

create table memory_comments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories (id),
  user_id uuid not null references auth.users (id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index memory_comments_memory_id_idx
  on memory_comments (memory_id) where deleted_at is null;

create trigger memory_comments_set_updated_at
  before update on memory_comments
  for each row execute function set_updated_at();

alter table memory_comments enable row level security;

-- Same shape as every other table's policies: a shared two-person book, not
-- per-row-owned data. The UI only offers a "remove" control on your own
-- notes, but that's a UI choice, not an access-control one — matches how
-- `memories_update` already works for the print itself.
create policy memory_comments_select on memory_comments for select using (auth.uid() is not null);
create policy memory_comments_insert on memory_comments for insert with check (auth.uid() is not null);
create policy memory_comments_update on memory_comments for update using (auth.uid() is not null) with check (auth.uid() is not null);
