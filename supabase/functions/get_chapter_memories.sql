-- The only sanctioned way to read memory rows. See
-- docs/agent/codebase-map/data-model.md ("Time-capsule enforcement is NOT an
-- RLS concern") for why this exists as a function instead of relying on RLS.
--
-- Deliberately NOT security definer: it runs as the calling (authenticated)
-- user, so the existing `memories_select` RLS policy still applies on top of
-- this function's own filtering. Two independent layers, not one.

create or replace function get_chapter_memories(p_chapter_id uuid)
returns setof memories
language sql
stable
as $$
  select *
  from memories
  where chapter_id = p_chapter_id
    and deleted_at is null
    and (unlock_at is null or unlock_at <= now())
  order by occurred_at asc, created_at asc;
$$;

-- Cross-chapter read, used by the timeline/stats page and the surprise
-- engine's candidate pool. Same filtering rules as above, applied globally.
create or replace function get_all_memories()
returns setof memories
language sql
stable
as $$
  select *
  from memories
  where deleted_at is null
    and (unlock_at is null or unlock_at <= now())
  order by occurred_at asc, created_at asc;
$$;
