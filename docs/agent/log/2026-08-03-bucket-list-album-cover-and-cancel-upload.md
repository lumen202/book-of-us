# 2026-08-03 — Album cover concept, cancel-before-upload on every photo picker

Third follow-on to the bucket-list album work today. User feedback after trying it:

1. The reference photo added when writing down a promise should be *the album's cover*, not
   just another tile mixed into the grid.
2. Confirmed (already shipped, no change needed): adding more photos to an album at any time.
3. Every photo picker needs a way to cancel a wrong pick before it uploads — "what if I click the
   wrong photo, it would be a pain to upload it and then delete."

## What shipped

- `supabase/migrations/0010_bucket_list_album_cover.sql`: new `bucket_list_items.cover_memory_id`.
  Kept deliberately separate from `memory_id` rather than reusing it — `completeItem`/
  `attachMemoryToItem` treat a non-null `memory_id` as "already kept," so writing a reference
  photo's id there would have silently broken keeping that promise later. `cover_memory_id` is
  independent of kept status: `addAlbumPhoto` claims it for a promise's first photo (`where
  cover_memory_id is null`), and `writeLinkedMemory` unconditionally overwrites it with the
  kept-day photo when the promise is actually kept.
- `lib/bucket-list/{types,queries,mutations}.ts`: wired through.
- `components/bucket-list/PromiseAlbumGrid.tsx`: new `CoverCard` — the cover shown on its own,
  centered, no tilt (it's the title page, not a loose print), excluded from the grid below.
- `app/(app)/bucket-list/[id]/page.tsx`: splits fetched photos into cover vs. rest; "Kept" label
  now reads "Still a wish" for an open item's reference-photo album.
- Cancel-before-upload: `AddPromiseModal`, `CompletionModal`, and `AddAlbumPhotoComposer` all got
  a × on the local preview, before anything reaches Storage. The multi-file composer needed the
  most work — it previously had no per-file preview at all, just a text count; now each picked
  file gets its own thumbnail + remove button, and repeated picks accumulate instead of replacing
  the queue.

Docs updated in place in `docs/agent/codebase-map/bucket-list.md`.

## Not yet done

Same standing item as every bucket-list entry today: nothing in `supabase/migrations/` or
`supabase/functions/get_chapter_memories.sql` is applied to the live database yet, including this
session's `0010`. All of it — 0009, 0010, and the three RPCs — needs pasting into the Supabase SQL
editor by hand before the album feature works end to end.
