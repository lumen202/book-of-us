-- Emoji reactions on vault photos — same shape as memory_reactions
-- (0003_reactions.sql): one row per (vault_item, user), soft delete via
-- deleted_at, RLS with no DELETE policy, upsert on the primary key to
-- change/clear a reaction rather than ever deleting the row.
--
-- Its own table rather than reusing memory_reactions with a vault_item_id
-- column: the two photo systems (memories, vault_items) are kept from ever
-- sharing a table specifically so a vault row can never accidentally surface
-- through a memories-shaped query path. Reactions follow the same split.

create table vault_reactions (
  vault_item_id uuid not null references vault_items (id),
  user_id uuid not null references auth.users (id),
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (vault_item_id, user_id)
);

create index vault_reactions_vault_item_id_idx
  on vault_reactions (vault_item_id) where deleted_at is null;

create trigger vault_reactions_set_updated_at
  before update on vault_reactions
  for each row execute function set_updated_at();

alter table vault_reactions enable row level security;

create policy vault_reactions_select on vault_reactions for select using (auth.uid() is not null);
create policy vault_reactions_insert on vault_reactions for insert with check (auth.uid() is not null);
create policy vault_reactions_update on vault_reactions for update using (auth.uid() is not null) with check (auth.uid() is not null);
