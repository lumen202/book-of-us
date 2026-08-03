# 2026-08-03 — Album reuses the chapter's rich grid; removed promises hide their chapter photo

Fourth bucket-list session today. User's reference: a screenshot of a chapter's grid (reactions,
"kept by you", note counts, a persistent × to remove), asking why the album page didn't look and
behave the same way. Two more fixes landed alongside it.

## The big one: `MemoryCard`/`MemoryDetail`/`MemoryReactions`/`MemoryComments` are now context-agnostic

These four were hardcoded to "a chapter" — they took `chapterSlug`/`chapterId` and imported
`app/(app)/chapters/[slug]/actions.ts` directly. The mutations underneath
(`lib/reactions/mutations.ts`, `lib/comments/mutations.ts`, `lib/memories/mutations.ts`) were
already fully generic; the only chapter-specific part was which Server Action wrapper got called
and which path it revalidated. So: the four leaf components now take plain callback props
(`onReact`, `onUnreact`, `onAdd`/`onEdit`/`onRemove` for comments, `onEditCaption`,
`resolveFullUrl`) instead. `MemoryGrid.tsx` is now the *only* component that knows "chapter" vs
"album" — a new `context` prop (`{ kind: "chapter", chapterId, chapterSlug } | { kind: "album",
itemId }`), and an exported `bindMemoryActions(context)` that builds the right bound closures.
The chapter page's own call site changed shape only (wraps its existing ids into `context`) — its
rendered behavior is unchanged, verified via `tsc`/`eslint` and a careful line-by-line diff (no
authenticated browser testing was possible from this environment; flagging for manual QA).

New in `app/(app)/bucket-list/actions.ts`: `reactToAlbumPhoto`, `unreactToAlbumPhoto`,
`addAlbumComment`, `editAlbumComment`, `removeAlbumComment`, `removeAlbumMemory`,
`editAlbumMemoryCaption` — the album's copy of the chapter's action set, calling the exact same
`lib/` mutations, revalidating `/bucket-list/[id]` instead.

`PromiseAlbumGrid.tsx` now renders the non-cover photos through a real `<MemoryGrid context={{
kind: "album", itemId }}>` instead of a bespoke tile loop. The featured `CoverCard` stays (no
tilt, centered — explicitly wanted, kept distinct from the grid) but now opens the generalized
`MemoryDetail` via `bindMemoryActions` directly, and gained its own remove control — previously
there was no way to remove a reference-photo cover that never touched a chapter at all. The old
`AlbumLightbox` is gone, superseded.

## Back-link now points at where you actually came from

`MemoryGrid`'s redirect-to-album (built last session) now appends `?from=/chapters/${chapterSlug}`;
the album page reads it (`resolveBackLink`, only trusting a same-app `/chapters/...` path or
falling back to `/bucket-list`) and labels the back link accordingly.

## Removed promises now hide their cover photo from the chapter too

User's own words, after testing: soft-deleting a promise but still seeing its photo in the
chapter "is wrong." This is a deliberate **reversal** of the original design (`reopenItem`'s doc
comment: "an accidental un-tick must not be able to take a real photograph off the page") —
confirmed explicitly with the user before changing it, since it's a real behavior change, not an
obvious bug fix.

Implemented as a live read-time exclusion, not a cascaded delete: `get_chapter_memories` and
`get_all_memories` (`supabase/functions/get_chapter_memories.sql`) now exclude a memory whose
`bucket_list_item_id` points at a currently soft-deleted promise. The memory's own `deleted_at` is
never touched by `removeItem`, so restoring the promise from the archive brings the photo back
automatically — no separate reconciliation needed, and a photo independently removed via the
chapter's own control stays removed regardless of the promise's status (the two `deleted_at`s
never interact).

## Not yet done

The largest outstanding SQL backlog of the day — nothing today needs a *new* migration (the
context refactor is component/action-layer only), but everything from `0009` onward is still
unapplied: `0009`, `0010`, and now four revisions to `get_chapter_memories.sql`
(`get_bucket_item_memories`, `get_bucket_item_photo_flags`, and today's `get_chapter_memories`/
`get_all_memories` rewrites). All of it needs pasting into the Supabase SQL editor before any of
this — including the plain chapter-reading experience improvements — works against live data.
