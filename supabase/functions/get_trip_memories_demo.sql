-- The `demo` schema's copy of supabase/functions/get_trip_memories.sql — see
-- get_chapter_memories_demo.sql's header comment for why this exists and why
-- it isn't security definer.

create or replace function demo.get_trip_memories(p_trip_id uuid)
returns setof demo.memories
language sql
stable
as $$
  select m.*
  from demo.memories m
  where m.trip_id = p_trip_id
    and m.deleted_at is null
    and (m.unlock_at is null or m.unlock_at <= now())
    and (
      m.bucket_list_item_id is null
      or exists (
        select 1 from demo.bucket_list_items b
        where b.id = m.bucket_list_item_id and b.deleted_at is null
      )
    )
  order by m.occurred_at asc, m.created_at asc;
$$;
