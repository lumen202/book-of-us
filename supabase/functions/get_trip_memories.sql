-- Reading memories by trip_id must go through a sanctioned RPC, same "no raw
-- memory reads" invariant get_chapter_memories.sql exists for — see
-- docs/agent/codebase-map/data-model.md and trips.md. Filtering mirrors
-- get_chapter_memories exactly (deleted_at, unlock_at, the bucket-list
-- removed-cover exclusion), keyed on trip_id instead of chapter_id.

create or replace function get_trip_memories(p_trip_id uuid)
returns setof memories
language sql
stable
as $$
  select m.*
  from memories m
  where m.trip_id = p_trip_id
    and m.deleted_at is null
    and (m.unlock_at is null or m.unlock_at <= now())
    and (
      m.bucket_list_item_id is null
      or exists (
        select 1 from bucket_list_items b
        where b.id = m.bucket_list_item_id and b.deleted_at is null
      )
    )
  order by m.occurred_at asc, m.created_at asc;
$$;
