# 2026-08-03 — Category dropdown, filter, active-nav highlighting, reference photos on open items

Follow-on to `2026-08-03-bucket-list-album.md`, same day. User reported the category picker's old
tap-to-cycle glyph was invisible as a control (confirmed: the default "Other" category's glyph is
a plain cross, indistinguishable from a decorative "+"). Requested a proper dropdown, a filter,
some "where am I" indicator in the header, and — after checking the add-promise modal — an
optional photo there too.

## What shipped

- `components/bucket-list/CategoryDropdown.tsx` (new): replaces the cycle-glyph everywhere
  (`AddPromiseModal`, `BucketItemRow`'s inline edit) with an unfold panel listing all 7 categories,
  reusing the nav's own dropdown mechanics (`DesktopMoreMenu`/`MobileNavMenu`/`AdminMenu`).
  `AddPromiseModal` also got its own labeled "Category" field, out of the title row's cramped
  margin.
- `components/bucket-list/CategoryFilterRow.tsx` (new) + `BucketList.tsx`: filter by category,
  quiet glyph toggles rather than colored pill chips (matching the restraint `BUG-004`'s nav
  restructuring established) — hides itself below 2 categories in use.
- `components/nav/NavLink.tsx` (new): the "where am I" ask, deliberately *not* a breadcrumb trail
  (would read as dashboard chrome) — just marks the current top-level section in the existing nav
  (`AppHeader`'s inline row, `MobileNavMenu`, `DesktopMoreMenu`'s Settings link) via a color/
  underline shift, same vocabulary the book already uses for "the thing that's true right now."
- Reference photos on open (not-yet-kept) items — `AddPromiseModal` gained an optional photo
  picker. Reuses the album machinery built earlier today (`addPromiseAlbumPhoto`) rather than a
  new mechanism: `addItem` now accepts a client-supplied `id` (same reason `createMemory` does),
  generated in the modal so the photo can be tagged to the row before it exists. New batched
  `get_bucket_item_photo_flags` RPC + `getBucketItemPhotoFlags` lets `BucketItemRow` show a "with a
  picture" link on an open item — deliberately different copy from a kept promise's "there's a
  photograph," preserving the wish/memory distinction the design already cares about elsewhere.
- `docs/agent/codebase-map/bucket-list.md` rewritten in place for all of the above; the stale
  `docs/plans/bucket-list.md` reference (that file doesn't exist in the repo) removed.

## Caught mid-session

Left `AddPromiseModal.tsx` in a broken intermediate state for one turn (removed the
`cycleCategory` function and its imports before replacing the JSX that used them) — the resulting
crash rendered something unexpected in the modal, which the user understandably read as a
mysterious new "HOME" element and asked to build on. Fixed by finishing the edit rather than by
building the misread artifact into a feature; worth remembering that a broken client component
can render *something* rather than nothing, and it can look intentional.

## Not yet done

Same as the previous entry: `0009_bucket_list_album.sql` and the appended functions in
`get_chapter_memories.sql` (now including `get_bucket_item_photo_flags`) are not applied anywhere.
Needs pasting into the Supabase SQL editor by hand before any of this — the album page, the
reference-photo picker, the photo-flag links — will work against the live database.
