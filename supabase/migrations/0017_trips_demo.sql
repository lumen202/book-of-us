-- Trips, mirrored into the demo schema — same shape as 0013_places_demo.sql
-- did for 0012_places.sql.

create table demo.trips (
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

create index demo_trips_active_idx on demo.trips (started_on) where deleted_at is null;

create trigger trips_set_updated_at
  before update on demo.trips
  for each row execute function set_updated_at();

alter table demo.trips enable row level security;

create policy trips_select on demo.trips for select using (auth.uid() is not null);
create policy trips_insert on demo.trips for insert with check (auth.uid() is not null);
create policy trips_update on demo.trips for update using (auth.uid() is not null) with check (auth.uid() is not null);

alter table demo.memories add column trip_id uuid references demo.trips (id);
create index demo_memories_trip_id_idx on demo.memories (trip_id) where deleted_at is null and trip_id is not null;
