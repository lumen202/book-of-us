-- The `demo` schema's copy of supabase/functions/get_chapter_memories.sql —
-- identical logic, querying demo.memories/demo.bucket_list_items/demo.chapters
-- instead of the public ones. Same name as the public versions on purpose:
-- a client opened with `db.schema: "demo"` (see lib/supabase/project.ts) has
-- only this schema in its PostgREST search path, so `.rpc("get_chapter_memories", ...)`
-- resolves to this one, not public's — lib/*/queries.ts never needs to know
-- which project it's talking to.
--
-- Deliberately NOT security definer, same reasoning as the public versions:
-- runs as the calling (authenticated) user, so demo.memories_select still
-- applies on top of this function's own filtering.

create or replace function demo.get_chapter_memories(p_chapter_id uuid)
returns setof demo.memories
language sql
stable
as $$
  select m.*
  from demo.memories m
  where m.chapter_id = p_chapter_id
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

create or replace function demo.get_all_memories()
returns setof demo.memories
language sql
stable
as $$
  select m.*
  from demo.memories m
  where m.deleted_at is null
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

create or replace function demo.get_memory_chapter_links(p_memory_ids uuid[])
returns table (memory_id uuid, chapter_slug text, chapter_title text)
language sql
stable
as $$
  select m.id, c.slug, c.title
  from demo.memories m
  join demo.chapters c on c.id = m.chapter_id
  where m.id = any(p_memory_ids)
    and m.deleted_at is null
    and (m.unlock_at is null or m.unlock_at <= now())
    and c.deleted_at is null;
$$;

create or replace function demo.get_bucket_item_memories(p_bucket_list_item_id uuid)
returns setof demo.memories
language sql
stable
as $$
  select *
  from demo.memories
  where bucket_list_item_id = p_bucket_list_item_id
    and deleted_at is null
    and (unlock_at is null or unlock_at <= now())
  order by occurred_at asc, created_at asc;
$$;

create or replace function demo.get_bucket_item_photo_flags(p_item_ids uuid[])
returns table (bucket_list_item_id uuid)
language sql
stable
as $$
  select distinct bucket_list_item_id
  from demo.memories
  where bucket_list_item_id = any(p_item_ids)
    and deleted_at is null
    and (unlock_at is null or unlock_at <= now());
$$;
