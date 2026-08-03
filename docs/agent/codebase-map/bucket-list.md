# Bucket List

A page of promises that convert into memories when kept — `/bucket-list`, linked from
`AppHeader`. This file is the living record of the design; there is no separate plan doc to defer
to (the original build plan is gone from the repo, superseded by this file and
`docs/agent/log/`).

## The chapter-resolution trap — read this before touching completion

`completeItem` / `attachMemoryToItem` do **not** file a kept promise's photo into "the current
month's chapter." Chapters aren't pre-seeded (a chapter for the current month may not exist yet)
and they unlock one per monthsary (a chapter that exists for the current month may not be
*revealed* yet). Naively using the current month means a real failure mode: tick a promise, watch
the polaroid animation, then the photograph is invisible on the shelf — 404 if you follow the
link. It reads exactly like data loss for the single most emotionally loaded action in the app.

`resolveTargetChapter()` in `lib/chapters/queries.ts` is the fix: the current month's chapter
**only if it's already revealed**, otherwise the newest chapter that is. `memories.occurred_at`
still records the true date, so once the real month's chapter is written the memory can be
re-filed with a one-line update. **If this function's fallback is ever "changed to just use the
current month," put it back** — that reintroduces the invisible-memory bug.

The client resolves the chapter (`resolveChapterForCompletion` in
`app/(app)/bucket-list/actions.ts`) *before* uploading, because the photo's storage path
(`chapters/{chapterId}/{memoryId}/…`) needs a real, already-revealed `chapterId`.

## The conversion: link, never copy

`bucket_list_items.memory_id` points at `memories.id` — nullable, and null on purpose in two
legitimate states: an open item, and an item completed **without** a photo (fully supported;
"no photo? that's alright" in `CompletionModal`). The promise's own text
(`bucket_list_items.title`) and the memory's own title/caption are allowed to disagree — *"see
snow together"* becomes a print captioned *"Sagada, 4am, freezing"*. Forcing them to match would
erase the difference between the wish and the day it happened.

Reopening a kept promise (`reopenItem`) never deletes the memory — `memory_id` is left in place.
The print only ever leaves the album through the album's own remove flow, a separate and
deliberate action; an accidental un-tick must not be able to take a real photograph off the page.

## Retry safety

`completeItem` / `attachMemoryToItem` guard the same failure the plan calls out explicitly: if
the memory write succeeds but the item's own `status`/`memory_id` update then fails, a retry must
link the memory that already exists rather than write a second one. `CompletionModal` generates
its `memoryId` once per modal session (`useState(() => crypto.randomUUID())`) and reuses it across
retries; `writeLinkedMemory` in `lib/bucket-list/mutations.ts` catches the resulting Postgres
unique-violation (`23505`) on `createMemory` and falls through to the link step instead of
throwing. The link write itself is guarded with `.is("memory_id", null)` in the `where` clause, so
two completions racing the same item (a double-tap, or two devices) produce at most one link — the
loser's update is a harmless no-op at the database, not a check in React state.

## The list page still signs no images — but it isn't "zero photo queries" anymore

No per-item cover photo, no thumbnail beside a row, ever — a promise (kept or still open) links to
its photo with **text**, never an eagerly-loaded `<img>`. `CategoryGlyph` is inline SVG in
`currentColor`, not an icon library or image asset, for the same reason: this page's cost has to
stay flat as the list grows, on a free Supabase plan with a 5 GB/month egress budget.

What changed: an open item can now carry a reference photo too (see "Reference photos on open
items" below), which needed one thing the list page didn't have before — a signal for *whether*
a row has a photo at all, open or kept. `getBucketItemPhotoFlags` (`lib/memories/queries.ts`,
backed by the batched `get_bucket_item_photo_flags` RPC) is that signal: one query for the whole
page, ids only, no image data, called once in `app/(app)/bucket-list/page.tsx` alongside
`get_memory_chapter_links`. Still zero signed URLs on this page — a photo only ever resolves once
its row's own link is opened, on `/bucket-list/[id]`.

## A kept promise can hold an album, not just one photo

`bucket_list_items.memory_id` still means exactly what it always has: the **cover** photo, the
one also filed into a chapter (unchanged — `completeItem`/`attachMemoryToItem` still write it the
same way). What's new is `memories.bucket_list_item_id`, which tags *every* photo belonging to a
promise, the cover included. `get_bucket_item_memories(p_bucket_list_item_id)`
(`supabase/functions/get_chapter_memories.sql`) reads a promise's whole album by that tag, the
same RPC-not-raw-read pattern every memory read follows (`data-model.md`).

Additional photos beyond the cover are written with `chapter_id = null` — deliberately never in
any chapter's flat grid, so a twenty-photo trip doesn't dump twenty cards into that month's page.
They only ever show on the promise's own album page, `/bucket-list/[id]`
(`app/(app)/bucket-list/[id]/page.tsx`), added there via `addAlbumPhoto`
(`lib/bucket-list/mutations.ts`) and `AddAlbumPhotoComposer.tsx` (modeled on
`components/memory/MemoryComposer.tsx`). `resolveTargetChapter()` is still called from that
composer, but only to build the upload's storage-path folder — storage paths aren't a security
boundary (RLS on `storage.objects` only checks `bucket_id`/`auth.uid()`), so this doesn't file the
photo into that chapter.

`BucketItemRow`'s "there's a photograph" link goes to the album page now, not straight to the
chapter — the album page itself links onward to "see the cover print in {chapter}" when there is
one.

**Deliberately not in this round:** removing a photo from an album (view-and-add only for now —
`PromiseAlbumGrid.tsx` has no remove control; adding one later can reuse `softDeleteMemory` with
no backend changes), and no count-aware copy on the list page ("1 photograph" vs "an album of 6")
— that would need a new batched query on a page that currently signs zero URLs and makes zero
memory queries per row, and the real count is one click away regardless.

## Category is a check constraint, not a table

`bucket_list_items.category` mirrors how `memories.type` is modelled: two people, a fixed handful
of kinds of promise, no join for an app-wide taxonomy of eight values.

**Picking a category:** `CategoryDropdown.tsx` — a small unfold panel listing all 7 with their
glyphs, reusing the exact same mechanics as the nav's own dropdowns (`DesktopMoreMenu`/
`MobileNavMenu`/`AdminMenu`: click-outside/Escape to close, `framer-motion` fade-and-lift
respecting `useReducedMotion`). This replaced a tap-to-cycle single glyph that silently stepped
through all 7 on each tap with no visible label — it read as decoration, not a control, and the
category system was effectively invisible until this changed. Used in both `AddPromiseModal`
(its own labeled "Category" field, not squeezed into the title row's margin like before) and
`BucketItemRow`'s inline edit.

**Filtering by category:** `CategoryFilterRow.tsx`, rendered above the list whenever at least 2
categories are actually in use among the current items — filters both the open and kept sections
at once. Deliberately not colored pill/badge chips (that reads as a dashboard filter bar, the
exact thing `BUG-004` moved the nav away from); it's the same small glyph-in-the-margin language
`CategoryGlyph` already uses everywhere on this page, made tappable, with the active one picked
out by color the same way `NavLink` marks the current section in the header.

## Reference photos on open items

An open (not-yet-kept) promise can carry a photo too — "this is roughly what we're picturing,"
attached in `AddPromiseModal` when the promise is first written down. This is a real, deliberate
addition to what a photo means here, not just a UI gap: it's the same album machinery a kept
promise's extra photos use (`addPromiseAlbumPhoto` → `addAlbumPhoto`,
`lib/bucket-list/mutations.ts`), just invoked at add-time instead of at or after keeping. `addItem`
takes an optional client-supplied `id` for this — same reason `createMemory` does (the row's id has
to exist before the upload's storage path and the `bucketListItemId` tag can be written), generated
in `AddPromiseModal` the same way `CompletionModal` generates its `memoryId`.

**The wish/kept distinction still matters, so the copy differs.** A kept promise's photo reads
"there's a photograph" (the day it actually happened). An open item's reference photo reads "with
a picture" — softer, because it's a wish, not a memory, even though both link to the same
`/bucket-list/[id]` page and both are, underneath, just photos tagged with the same
`bucket_list_item_id`. See `bucket_list_items.title` vs. a memory's own title/caption being allowed
to disagree, above — same instinct, applied to language instead of data.

## Deliberately out of scope for v1

- **Manual reordering.** `bucket_list_items.position` exists and new promises append to the end of
  it, but there's no drag UI and no `reorderItems` mutation — nothing in the UI needed it yet, and
  an unused mutation is dead code. Add both together if reordering becomes a real ask.
- **A "gallery of everything we've done" view.** The obvious next screen, and `N` signed URLs for a
  set that only grows — exactly the cost `reading-experience.md` warns about. Not until the free
  tier picture changes.

## Files

```
supabase/migrations/0005_bucket_list.sql   schema
supabase/migrations/0009_bucket_list_album.sql  memories.bucket_list_item_id + backfill
supabase/functions/get_chapter_memories.sql  + get_memory_chapter_links, get_bucket_item_memories,
                                              get_bucket_item_photo_flags (appended)
lib/bucket-list/{types,queries,mutations}.ts
lib/chapters/queries.ts                    resolveTargetChapter()
lib/media/uploadMemoryMedia.ts             shared upload pipeline (also used by MemoryComposer)
app/(app)/bucket-list/{page,actions}.tsx
app/(app)/bucket-list/[id]/page.tsx        a kept promise's own album page
components/bucket-list/
  BucketList.tsx        client shell, owns which item (if any) has a modal open, owns the filter
  BucketItemRow.tsx      one promise: glyph, text, tick target, long-press to edit (open items only)
  CategoryGlyph.tsx      inline SVG per category
  CategoryDropdown.tsx   pick a category — unfold panel, all 7 visible
  CategoryFilterRow.tsx  filter the list by category
  AddPromiseLine.tsx     "and one day, we'll…" — becomes an input on tap
  AddPromiseModal.tsx    title, note, category, optional reference photo
  CompletionModal.tsx    tick → ask → working → become → resolve
  PromiseAlbumGrid.tsx   the album page's photo grid + lightbox
  AddAlbumPhotoComposer.tsx  add more photos to an already-kept promise
```
