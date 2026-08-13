-- Surprises — the "on this day / from the book" resurfacing beat (see
-- docs/agent/codebase-map/surprises.md, lib/surprises/). This migration adds
-- the one piece of state the feature needs on `memories` itself: a way to
-- keep a specific memory out of the resurfacing pool without soft-deleting
-- it. Cooldown/recently-shown state lives in `relationship.settings.surprises`
-- (jsonb, no migration needed — see lib/relationship/mutations.ts).
--
-- No RPC changes needed: get_all_memories()/get_chapter_memories() already
-- `select m.*`/`select *`, so this column flows through to every existing
-- caller automatically.

alter table memories add column resurface_excluded boolean not null default false;

create index memories_resurface_idx on memories (occurred_at)
  where deleted_at is null and resurface_excluded is false;
