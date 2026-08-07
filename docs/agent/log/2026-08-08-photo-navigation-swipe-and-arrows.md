# 2026-08-08 — Prev/next navigation for prints and place photos (swipe, arrows, keys)

## What shipped

Opened photos were dead ends: a lifted print (`MemoryDetail`) and a place's full-screen photo
(`PhotoLightbox` from `PlaceGallery`) both had to be closed and the neighbour re-opened. Both now
step sideways:

- **`lib/navigation/useSwipeNavigation.ts`** (new) — shared horizontal-swipe hook. Touch events,
  not a framer drag: judged only on release (56px, dominant axis by 1.5×) so it never fights the
  detail modal's vertical scroll or pinch-zoom (a second finger cancels it). No wrap-around by
  design — an album page has a first and a last print.
- **`PhotoLightbox`** — optional `onPrev`/`onNext`/`position` props: swipe, ←/→ keys, edge arrow
  buttons (`hidden sm:flex`; touch gets the swipe), and a "3 of 7" marker. Image now keyed by
  `src` so stepping swaps the element after decode instead of blanking mid-load. Without the
  props it renders exactly as before (a memory's lone photo, the album cover).
- **`PlaceGallery`** — passes all three into the lightbox.
- **`MemoryDetail`** — optional `onPrev`/`onNext`: swipe on the card, ←/→ on the window (ignored
  while the lightbox is up, while editing, or when the event target is an input/textarea/
  contentEditable — arrows belong to the caret there), arrow buttons on the backdrop edges.
- **`MemoryGrid`** — computes the walkable list and binds the callbacks. From a chapter it
  excludes promise-cover prints (their tap `router.push`es to the album rather than opening a
  detail, so stepping "into" one would silently swap a modal for a page navigation).

## The trap worth remembering

`useCloseOnBack` pushes one history entry **per mount**, and `MemoryGrid` keyed the detail by
`selected.id` — so navigating N prints would have stacked N history entries and turned the back
button into a walk back through every print visited. Fix: the detail's key is now the stable
`"memory-detail"`, and `MemoryDetail` resets its per-memory state (full-size URL, caption draft,
`editingCaption`, `zoomed`) via the render-time reset pattern (`shownMemoryId` state compared
against `memory.id`). Anyone adding per-memory state to `MemoryDetail` must add it to that reset
block, or it will leak across prev/next steps.

`PromiseAlbumGrid`'s cover detail keeps `key={cover.id}` — it's a single photo, no nav passed.

## Watch out for

- New per-memory `useState` in `MemoryDetail` → add it to the `shownMemoryId` reset block.
- `PlaceGallery`'s lightbox now stays mounted across steps (index changes, not mount) — anything
  added to `PhotoLightbox` with mount-only behaviour should consider a `src` change too.
