-- The only sanctioned way to read memory rows. See
-- docs/agent/codebase-map/data-model.md ("Time-capsule enforcement is NOT an
-- RLS concern") for why this exists as a function instead of relying on RLS.
--
-- Deliberately NOT security definer: it runs as the calling (authenticated)
-- user, so the existing `memories_select` RLS policy still applies on top of
-- this function's own filtering. Two independent layers, not one.

-- A memory tied to a *removed* promise (bucket_list_items.deleted_at set)
-- doesn't come back from either read below — see
-- docs/agent/codebase-map/bucket-list.md. This is a live check, not a
-- cascaded delete onto the memory row: restoring the promise from the
-- archive makes its cover photo visible again automatically, with nothing
-- else to reconcile. Only ever matters for a memory with
-- bucket_list_item_id set (the cover); everything else passes through
-- unaffected.
create or replace function get_chapter_memories(p_chapter_id uuid)
returns setof memories
language sql
stable
as $$
  select m.*
  from memories m
  where m.chapter_id = p_chapter_id
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

-- Cross-chapter read, used by the timeline/stats page and the surprise
-- engine's candidate pool. Same filtering rules as above, applied globally —
-- including the removed-promise exclusion, for the same reason: a photo
-- that's meant to be gone from its chapter shouldn't resurface in a
-- surprise pull or a timeline view either.
create or replace function get_all_memories()
returns setof memories
language sql
stable
as $$
  select m.*
  from memories m
  where m.deleted_at is null
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

-- Lets a kept bucket-list promise say "there's a photograph, in <chapter>"
-- and link to it, without the bucket list ever reading the memories table
-- itself (see lib/bucket-list/queries.ts). Same filtering as above: a
-- memory that's locked or has been removed simply doesn't come back, so a
-- kept promise can never leak the existence of content it shouldn't be able
-- to see. A bucket-list completion photo is never itself time-capsuled
-- (completeItem never sets unlock_at), so this only ever matters for the
-- edge case of a memory later locked or deleted by hand.
create or replace function get_memory_chapter_links(p_memory_ids uuid[])
returns table (memory_id uuid, chapter_slug text, chapter_title text)
language sql
stable
as $$
  select m.id, c.slug, c.title
  from memories m
  join chapters c on c.id = m.chapter_id
  where m.id = any(p_memory_ids)
    and m.deleted_at is null
    and (m.unlock_at is null or m.unlock_at <= now())
    and c.deleted_at is null;
$$;

-- A kept bucket-list promise's whole album — the cover (also filed into a
-- chapter) and any additional photos (chapter_id left null, see
-- lib/bucket-list/mutations.ts's addAlbumPhoto) returned together. Same
-- filtering as get_chapter_memories: a locked or removed photo doesn't come
-- back.
create or replace function get_bucket_item_memories(p_bucket_list_item_id uuid)
returns setof memories
language sql
stable
as $$
  select *
  from memories
  where bucket_list_item_id = p_bucket_list_item_id
    and deleted_at is null
    and (unlock_at is null or unlock_at <= now())
  order by occurred_at asc, created_at asc;
$$;

-- Which bucket-list items have at least one photo, batched for the whole
-- list page in one call — lets an *open* (not-yet-kept) promise show a
-- "there's a picture of it" link without the list page signing any image
-- URLs or making one query per row. No image data returned, just the ids.
create or replace function get_bucket_item_photo_flags(p_item_ids uuid[])
returns table (bucket_list_item_id uuid)
language sql
stable
as $$
  select distinct bucket_list_item_id
  from memories
  where bucket_list_item_id = any(p_item_ids)
    and deleted_at is null
    and (unlock_at is null or unlock_at <= now());
$$;
