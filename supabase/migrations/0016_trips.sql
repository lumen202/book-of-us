-- Trips — a lightweight grouping of memories under one journey, optionally
-- tied to a `lib/places/` destination. See docs/agent/codebase-map/trips.md.
-- `place_slug` is a plain text FK-by-convention, same as `place_saves` in
-- 0012_places.sql — there's no `places` table to reference. Same shape as
-- every other table here: shared two-person data, soft delete, no delete
-- policy.

create table trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  place_slug text,
  started_on date,
  ended_on date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index trips_active_idx on trips (started_on) where deleted_at is null;

create trigger trips_set_updated_at
  before update on trips
  for each row execute function set_updated_at();

alter table trips enable row level security;

create policy trips_select on trips for select using (auth.uid() is not null);
create policy trips_insert on trips for insert with check (auth.uid() is not null);
create policy trips_update on trips for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- A memory can be filed under a trip, independent of its chapter — a photo
-- stays in its month's chapter and can *also* belong to "the Cebu trip".
-- Reading memories by trip_id must still go through a sanctioned RPC (see
-- get_trip_memories.sql), same "no raw memory reads" invariant as chapter_id.
-- ---------------------------------------------------------------------------
alter table memories add column trip_id uuid references trips (id);
create index memories_trip_id_idx on memories (trip_id) where deleted_at is null and trip_id is not null;
