# 2026-08-03 — Bucket-list promises can hold an album, not just one photo

## Why

User wanted a "places we want to visit" feature. The Bucket List already has a `travel` category
for exactly this (its category picker was just made visibly labeled this session, instead of an
unlabeled glyph that read as decoration) — so no new page or table for *adding* a place. The real
gap: keeping a promise produces exactly one photo today, filed into that month's chapter. A trip
produces many. User's own framing: *"maybe every promise kept... create an album for that
promise... so that way our chapters stay organized."*

## What shipped

- `supabase/migrations/0009_bucket_list_album.sql`: `memories.bucket_list_item_id` (nullable FK),
  plus a backfill tagging every already-kept promise's existing cover photo.
- `supabase/functions/get_chapter_memories.sql`: new `get_bucket_item_memories(p_bucket_list_item_id)`
  RPC, same filter shape as `get_chapter_memories`.
- `lib/memories/mutations.ts`: `NewMemoryInput.chapterId` relaxed to `string | null`, new optional
  `bucketListItemId`.
- `lib/memories/queries.ts`: `getBucketItemMemories`, `getBucketItemMemoryFullUrl` (on-demand
  full-size signing, same pattern as `getMemoryFullUrl`).
- `lib/bucket-list/mutations.ts`: `writeLinkedMemory` now tags the cover with `bucketListItemId`;
  new `addAlbumPhoto` writes additional photos with `chapterId: null` — never touches
  `bucket_list_items.memory_id`, can be called any number of times.
- `lib/bucket-list/queries.ts`: `getBucketItem(id)`.
- `app/(app)/bucket-list/[id]/page.tsx` (new): a kept promise's own album page.
- `components/bucket-list/PromiseAlbumGrid.tsx` (new): trimmed sibling of `MemoryGrid`/
  `MemoryCard` — same corner-mount/tilt look, `PhotoLightbox` reused as-is, no
  reactions/comments/hold-gesture/remove (view + add only this round).
- `components/bucket-list/AddAlbumPhotoComposer.tsx` (new): modeled directly on
  `components/memory/MemoryComposer.tsx`.
- `components/bucket-list/BucketItemRow.tsx`: "there's a photograph" now links to the album page
  instead of straight to the chapter; the album page links onward to the chapter itself.

Design decisions and what's deliberately cut are written up in
`docs/agent/codebase-map/bucket-list.md` and `data-model.md` (updated in place, not appended).

## Not yet done

**The migration and RPC are not applied anywhere** — same as every earlier schema change in this
project (see `2026-07-28-bucket-list-and-inline-editing.md`), they need to be pasted into the
Supabase SQL editor by hand. Until that happens, the album page/composer will error against the
live database. The Supabase dashboard is the source of truth for what's actually live, not this
migrations folder.

## Also this session

- `components/nav/DesktopMoreMenu.tsx` replaced `AdminMenu.tsx` — desktop nav restructured behind
  a `More` menu (BUG-004 fixed).
- August's missing chapter backfilled directly (root cause: `CRON_SECRET` never set in Vercel).
- Desktop scroll lag (BUG-005): touch-only perf fixes in `globals.css` extended to all devices,
  `useParallax` disabled everywhere — unverified on-device.
- New themed favicon (`app/icon.tsx`), plus a `proxy.ts` matcher fix so it isn't 307'd behind auth.
- Bucket-list category picker now shows its label instead of an unlabeled glyph.
