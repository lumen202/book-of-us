-- Emoji reactions on memories — one per person per memory, toggled and
-- changed freely. Same shape as every other mutable table in this schema:
-- soft delete via deleted_at, RLS with no DELETE policy, updated_at trigger.
-- See docs/agent/codebase-map/data-model.md and the "no hard deletes"
-- invariant in overview.md — this table isn't an exception to it.

create table memory_reactions (
  memory_id uuid not null references memories (id),
  user_id uuid not null references auth.users (id),
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (memory_id, user_id)
);

-- One row per (memory, user) forever — "removing" a reaction stamps
-- deleted_at rather than deleting the row, and reacting again after that just
-- clears deleted_at and updates emoji, via upsert on the primary key.
create index memory_reactions_memory_id_idx
  on memory_reactions (memory_id) where deleted_at is null;

create trigger memory_reactions_set_updated_at
  before update on memory_reactions
  for each row execute function set_updated_at();

alter table memory_reactions enable row level security;

-- Same shape as every other table's policies: this is a shared two-person
-- book, not per-user-owned data, so any signed-in account can react to
-- (or un-react to) anything — not just rows it created itself.
create policy memory_reactions_select on memory_reactions for select using (auth.uid() is not null);
create policy memory_reactions_insert on memory_reactions for insert with check (auth.uid() is not null);
create policy memory_reactions_update on memory_reactions for update using (auth.uid() is not null) with check (auth.uid() is not null);
