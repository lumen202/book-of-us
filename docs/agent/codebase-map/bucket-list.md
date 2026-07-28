# Bucket List

A page of promises that convert into memories when kept — `/bucket-list`, linked from
`AppHeader`. Full design rationale (including the parts trimmed for v1) is in the plan this was
built from; the load-bearing decisions are repeated here.

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

## Zero images on the list page

The list itself signs **no** signed URLs — no per-item cover photo, no thumbnail beside a kept
promise. A kept promise links to its print with **text** ("there's a photograph"), resolved via
`get_memory_chapter_links` (`supabase/functions/get_chapter_memories.sql`), a small RPC rather than
a raw `memories` read — see `data-model.md`'s "no raw reads" rule. `CategoryGlyph` is inline SVG in
`currentColor`, not an icon library or image asset, for the same reason: this page's cost has to
stay flat as the list grows, on a free Supabase plan with a 5 GB/month egress budget.

## Category is a check constraint, not a table

`bucket_list_items.category` mirrors how `memories.type` is modelled: two people, a fixed handful
of kinds of promise, no join for an app-wide taxonomy of eight values. Categories are **shown** (a
small glyph in the margin) not **operated** — no filter chips in v1. If the open list passes
roughly 25 items, the next move is probably grouping under quiet headers, not a filter bar.

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
supabase/functions/get_chapter_memories.sql  + get_memory_chapter_links (appended)
lib/bucket-list/{types,queries,mutations}.ts
lib/chapters/queries.ts                    resolveTargetChapter()
lib/media/uploadMemoryMedia.ts             shared upload pipeline (also used by MemoryComposer)
app/(app)/bucket-list/{page,actions}.tsx
components/bucket-list/
  BucketList.tsx        client shell, owns which item (if any) has a modal open
  BucketItemRow.tsx      one promise: glyph, text, tick target, long-press to edit (open items only)
  CategoryGlyph.tsx      inline SVG per category
  AddPromiseLine.tsx     "and one day, we'll…" — becomes an input on tap
  CompletionModal.tsx    tick → ask → working → become → resolve
```
