# Parallax off on touch, an album-page loading state, and the signed-URL cost

Same day as `2026-07-28-backdrop-compositing-and-parallax-cost.md`, immediately after it. Two
reports: scrolling near the top of the page was *still* heavy on Android, and chapters will feel
broken rather than slow once there are real photos in them.

## Scroll near the top: parallax is off on touch devices now

The earlier fix removed the parallax's style-invalidation cost (custom property → direct
transform writes) but not its *compositing* cost, and the symptom survived it.

What was left: parallax is the only thing that makes the fixed backdrop change while the reader
scrolls. Nine layers move, and the paper-grain layer over them — `mix-blend-mode`, viewport-sized
— has to re-resolve against a changed backdrop every frame of every scroll. Everything else in
the scene moves in place and only dirties its own small rect; parallax dirties all of it, and
does so precisely when the phone is busiest.

So `useParallax` now bails on `(pointer: coarse)` as well as reduced-motion. Every layer keeps
its resting `translate3d(0, 0, 0)`, the backdrop becomes a texture the compositor already has,
and scrolling costs nothing behind the page.

Nothing else was touched: the wind still crosses the meadow, clouds drift, butterflies come and
go. What a phone loses is the world having thickness *as you scroll* — the cheapest thing in the
scene to give up, and the only one being paid for at the worst possible moment. If a future
session wants it back on mobile, the prerequisite is getting the last viewport-sized blend layer
(the paper mottle) out of the way first, not re-enabling this on its own.

## Chapter loading state

`app/(app)/chapters/[slug]/loading.tsx`. Next renders it the instant a chapter link is tapped and
swaps the page in when it streams.

Deliberately **not** a spinner — that would be the first piece of stock software in the book. It
is the album sheet with blank mounted prints in the real page's exact layout (same header block,
same three columns, same deterministic tilts from `MemoryCard`, same photo corners), breathing on
a slow `developing` keyframe rather than a shimmer sweep. The reader is looking at the right page
from the first frame and the photos develop into places already made for them; nothing shifts
when the real content lands.

Note that `AppHeader` in the shared layout is an async server component doing an uncached auth
read, which per the `loading.js` docs blocks navigation on a *page load*. It doesn't matter for
the case this is for — client navigation from the shelf shares that layout, so it isn't
re-rendered — but if someone later wants instant cold loads too, that's the thing in the way.

## Signed-URL cost, which is what actually scales

`resolveMemoryMedia` costs one Storage round trip per rendition per memory, and it was signing
**both** the thumbnail and the full-size URL for every print on every chapter open — while
awaiting the two sequentially within each memory. Fifty photos was a hundred round trips for a
page that only displays thumbnails.

- `resolveMemoryMedia(memories, { full: false })` — the chapter page signs thumbnails only. The
  two remaining requests per memory now run in parallel.
- New `getMemoryFullUrl(chapterId, memoryId)` + a `loadMemoryFullUrl` server action; `MemoryDetail`
  calls it when a print is lifted and shows the thumbnail it already has in the meantime, so the
  photo is on screen in the first frame and sharpens. Better than what it replaced, which showed
  nothing until the full image decoded.
- `getMemoryFullUrl` goes back through `getChapterMemories` rather than reading the row, so it
  can't be used as a side door around time-capsule gating.
- Signatures live 5 minutes, so a full URL minted at page load for a print opened later was
  expired anyway. Signing at the moment of opening is the more correct thing as well as the
  cheaper one.
- The archive keeps the default `full: true` — it lists soft-deleted rows that may have no
  thumbnail.

Also: the chapter page awaited memories → reactions → comments → `auth.getUser()` in sequence.
The last three are unrelated to each other and now run in one `Promise.all`.

## Print interactions, same session

Four follow-on requests, all in `components/memory/`:

- **"Fold this memory" moved to the top right** of the detail modal. It was already left-aligned;
  right is what was actually wanted.
- **Press and hold a grid print opens the reaction picker**, Facebook-style, alongside the corner
  ♡ which still works. `MemoryReactions`' `corner` variant gained optional `open`/`onOpenChange`
  so both drive one picker, plus outside-`pointerdown`/Escape dismissal — which matters much more
  now that the picker can open from a gesture you did not aim.
- **Tapping the photo inside the detail opens `PhotoLightbox`**, full-screen. New component. It is
  the one dark surface in the book (a warm wash would put a colour cast on the photograph); it
  renders inside the detail so the memory stays mounted underneath, which is why it stops click
  propagation, and why the Escape handler in `MemoryDetail` now closes one layer at a time.
- **`draggable={false}` on every album image.** Native image drag fires on exactly the
  press-and-hold the picker wants; the print was peeling off the page as a drag ghost.
  `select-none` and `-webkit-touch-callout: none` on the print button kill the OS "save image"
  sheet and text selection for the same press.
- **"Kept by you / your partner"** under the date in the detail. `created_by` was already on the
  row and already reaching the client (`get_chapter_memories` is `returns setof memories`), so no
  schema or query change — but there is still no mapping from an `auth.users` id to a name, so
  this asserts only what it can know, matching `MemoryComments`. Real names would need a
  migration adding partner user ids to `relationship`; flagged to the user, not done.

## Next session

- Still no on-device measurement of any of the backdrop work — the caveat from the previous entry
  stands and now covers more changes. Get a real Android trace before treating it as settled.
- `0003_reactions.sql` and `0004_comments.sql` remain unapplied in Supabase.
- If chapters get large, the next lever is the grid itself: every print is a `motion.div` with a
  `whileInView` transition and a large soft box-shadow, and neither was looked at this session.
