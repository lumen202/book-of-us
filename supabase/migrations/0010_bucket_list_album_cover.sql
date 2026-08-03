-- The album's cover — a distinct concept from bucket_list_items.memory_id.
--
-- memory_id keeps meaning exactly what it always has: the kept-day photo,
-- also filed into a chapter (completeItem/attachMemoryToItem's guard treats
-- a non-null memory_id as "already kept" — see lib/bucket-list/mutations.ts,
-- unchanged by this migration). A reference photo added when the promise is
-- still open must NOT set memory_id, or keeping the promise later would
-- silently no-op (the completion guard would think it's already kept).
--
-- cover_memory_id is which photo the album page features, independent of
-- kept status: it's set to a promise's first photo (reference or album
-- addition, whichever comes first) via addAlbumPhoto, and unconditionally
-- overwritten by writeLinkedMemory when the promise is actually kept — the
-- real day's photo earns the cover spot over a "picturing this" reference
-- image, but the reference photo itself stays in the album either way.

alter table bucket_list_items
  add column cover_memory_id uuid references memories (id) on delete set null;
