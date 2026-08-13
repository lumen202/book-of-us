-- Surprises, mirrored into the demo schema — same shape as 0013_places_demo.sql
-- did for 0012_places.sql.

alter table demo.memories add column resurface_excluded boolean not null default false;

create index demo_memories_resurface_idx on demo.memories (occurred_at)
  where deleted_at is null and resurface_excluded is false;
