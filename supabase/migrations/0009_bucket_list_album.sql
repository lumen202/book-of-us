-- A kept promise can hold more than one photograph. bucket_list_items.memory_id
-- keeps meaning exactly what it always has — the "cover" photo, the one also
-- filed into a chapter (see lib/bucket-list/mutations.ts, unchanged by this
-- migration). What's new: every photo belonging to a promise, the cover
-- included, is tagged with bucket_list_item_id, so one query
-- (get_bucket_item_memories, appended below) returns the whole album.
-- Additional photos beyond the cover are written with chapter_id null — they
-- never appear in any chapter's flat grid, which is the whole point: chapters
-- stay organized regardless of how many photos a trip produced.

alter table memories
  add column bucket_list_item_id uuid references bucket_list_items (id);

create index memories_bucket_list_item_id_idx on memories (bucket_list_item_id)
  where deleted_at is null and bucket_list_item_id is not null;

-- Backfill: tag every already-kept promise's existing cover photo, so its
-- album page isn't empty on day one.
update memories m
set bucket_list_item_id = b.id
from bucket_list_items b
where b.memory_id = m.id
  and m.bucket_list_item_id is null;
