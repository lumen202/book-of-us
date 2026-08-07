# Reading Experience — Chapters, Album Pages, Media

How a chapter is read, and how photos get in and out of it.

## Chapters are created on the 1st, revealed the moment they exist

A cron job (Vercel Cron, `vercel.json` → `app/api/cron/create-chapter/route.ts` →
`lib/chapters/mutations.ts`'s `ensureCurrentMonthChapter`) creates the current month's chapter row
automatically on the 1st of every month, so there's somewhere to add a photo all month — chapters
are no longer manually inserted the way `supabase/seed.sql` does it for the seeded first chapter.
The cron route has no signed-in user to act as, so it writes through `lib/supabase/admin.ts`'s
service-role client rather than the normal RLS-scoped one, gated by a `CRON_SECRET` shared-secret
header instead of a session.

**Reveal is a plain calendar check, not a monthsary count**: `lib/chapters/queries.ts`'s
`listRevealedChapters()` shows a chapter once `chapter.month <= start of this calendar month` —
nothing more. This used to be gated by counting elapsed monthsaries since
`relationship.started_at` instead (one reveal per monthsary, oldest-first) — see
`docs/agent/log/2026-07-27-chapter-gating-corrected-to-monthsary-count.md` — which existed to
survive chapters bulk-seeded with dates arbitrarily far from "today". Now that the 1st-of-month
cron is the only creation path, every chapter's own `month` already agrees with when it should
reveal, so the simpler calendar check is correct: **a new month's chapter is visible on the shelf,
and open for uploads, immediately on the 1st — not on its own monthsary.** The 5th only changes the
*atmosphere* (Celebration Mode, see `celebration-mode.md`), not visibility.

The calendar check still matters, though: it's what stops a chapter dated in the future (a
"how we met" backstory chapter authored ahead of time, say) from leaking onto the shelf early. It's
a real design tradeoff to keep in mind — a manually-inserted chapter dated in the past will now
appear immediately too, since nothing paces it against monthsaries any more.

`lib/chapters/queries.ts`'s `listRevealedChapters()` is the single gate: `listChapters()` (shelf)
and `getChapterBySlug()` (direct route) both go through it, so a not-yet-revealed chapter is
invisible on the shelf *and* 404s if its slug is guessed or bookmarked ahead of time. It's
application-code filtering, not RLS/RPC-enforced like memory time capsules (see `data-model.md`)
— this is pacing between two people who already see the same shared book, not a security boundary.

### Celebration's look-back always skips the current month

Because the current month's chapter is now visible (and uploadable) well before its own monthsary,
it may already hold a few days of photos by the time the 5th arrives for the *previous* month's
celebration. `lib/memories/queries.ts`'s `findLookBackPrints` explicitly filters out whatever
chapter matches the reference date's year/month before searching for prints — see that function's
doc comment. This is what keeps an in-progress current month from leaking into the completed
month's look-back.

## The dev clock

`lib/relationship/devClock.ts`'s `getAppNow()` is used everywhere `listChapters()` /
`getChapterBySlug()` / the "next chapter" countdown need to agree on the date. It's just
`new Date()` — real time, same in dev and production — with one dev-only escape hatch: set
`DEV_NOW=YYYY-MM-DD` in `.env.local` to preview a *later* monthsary than the one currently live,
without waiting for the real date or editing rows. An earlier version of this file pinned dev to a
fixed anchor date automatically; that was a temporary workaround for when the seeded start date
hadn't reached its first monthsary yet in real time, and it was removed once the start date moved
earlier and stopped needing it.

## The chapter is a photo album page

`app/(app)/chapters/[slug]/page.tsx` renders a title page (month, chapter title, one line of
framing copy), then the album, then the composer, then `ClosingReflection`.

- `components/memory/MemoryGrid.tsx` — one sheet of album paper (a `surface` panel with a faint
  warm bloom) with prints mounted on it in a masonry rhythm. Prints fade up on scroll-into-view
  with a small stagger so the page reads as turned-to, not loaded.
- `components/memory/MemoryCard.tsx` — one print: white mat, four photo-corner mounts, caption
  underneath, and a deterministic tilt from a `TILTS` array indexed by position (never random —
  the album must look identical on every visit). Hovering lifts the print and straightens it.
- `components/memory/MemoryDetail.tsx` — the lifted print. The photo is `object-contain` on its
  mat, not cropped: this is the one place the whole frame should be visible.

`MemoryGrid` wraps the detail in `AnimatePresence` so its exit variants actually play. Without
that wrapper they're dead code — this was silently the case before 2026-07-27.

- `components/memory/MemoryReactions.tsx` — a small, curated set of emoji reactions (see
  `lib/reactions/types.ts`; deliberately not Facebook's stock six), aggregated by emoji rather
  than attributed by person — with only two people in this book, per-person avatars would be the
  first genuinely app-like widget on the page. Two variants: `corner` (a sticker + tap-to-reveal
  picker on each grid print) and `inline` (the picker sits open in the lifted detail view). Data
  comes from `lib/reactions/`, which reads/writes `memory_reactions` directly — see `data-model.md`.
- `components/memory/MemoryComments.tsx` — freeform notes, detail view only (a note needs more
  room than a grid print has). Attributed as "You" / "Your partner" rather than a name — there's
  no reliable mapping anywhere from an auth account to "Joshua" or "Liezel", so the component only
  ever asserts the one thing it can know for certain (`comment.userId === currentUserId`), and
  that's also what gates the remove control (and now the edit control, same gate) — see
  `editComment` in `lib/comments/mutations.ts`. `MemoryCard` shows a small "N notes" count next to
  the date so a print with notes is discoverable from the grid without opening it.
- The caption itself (`memory.title`) is editable from the detail view's heading — click it, it
  becomes an input, same "tap it, it becomes an input" pattern used everywhere else edits happen
  in this app. Unlike a note, this isn't gated to whoever added the print: a caption is a shared
  label on a shared print. See `updateMemoryCaption` in `lib/memories/mutations.ts`.

## Photos only, for now

`albumPrints()` in `lib/memories/queries.ts` is the gate: the album shows `type === "photo"`
memories that resolved to an image. Letters, notes, songs and the rest are still stored and still
returned by the queries — they just have no designed treatment yet, so they are filtered out
rather than rendered as a placeholder card. Re-enabling them is a one-line change in that
function once they have a real design.

`MemoryCard` also returns `null` when a memory has no usable image, so a bad row can never render
an empty mat.

## Image weight — two independent layers

Phone photos are 4–8 MB and no view in this app shows more than ~1600px of one. Both ends are
handled, and they compose:

1. **Write side** — `lib/media/downscaleImage.ts` downsizes in the browser *before* upload
   (original ≤1600px, thumb ≤720px, WebP where supported, EXIF orientation applied via
   `createImageBitmap(…, { imageOrientation: "from-image" })`). The full-size original never
   reaches the bucket. This runs client-side because a Server Action body cap sits well below
   phone-photo size. `lib/media/uploadMemoryMedia.ts` wraps the whole downscale-then-upload
   sequence (both renditions, both storage objects) as the one path from a picked `File` to two
   objects in the bucket — `MemoryComposer` and the bucket list's `CompletionModal`
   (`codebase-map/bucket-list.md`) both call it rather than each inlining their own copy.
2. **Read side** — `lib/storage/getSignedUrl.ts` takes an optional `rendition` (`thumb`/`full`)
   and asks Supabase to resize as it serves. That transform is a paid Storage add-on; if it
   errors, the call **falls back to the untransformed original** rather than returning null, so
   the page gets heavier but never breaks. Only pass a rendition for images — video/audio would
   take the fallback path on every request.

### On the free plan, layer 2 is inactive — layer 1 is doing all the work

Image transformations are a **Pro+ add-on and are not included on the Supabase free plan**, which
is the plan this project runs on. So *every* `rendition` request errors and takes the fallback
path described above. Nothing is broken and nothing looks wrong — that graceful fallback is
precisely what's holding the pages up — but it means **`rendition` currently has no observable
effect, and `downscaleImage` is the only thing controlling image weight.** Don't spend a debugging
session working out why `thumb` and `full` seem to produce identical bytes; they do, and this is
why.

Two consequences worth keeping in mind:

- `ORIGINAL_MAX_EDGE` is now **1600**, matched exactly to `RENDITIONS.full`. It was 2000, and those
  extra 400px were never displayed by anything — with transforms on they'd be downsampled away,
  and with transforms off (here) the whole file went over the wire to be drawn at 1600. Area scales
  with the square, so this took roughly a third off every original in both bucket and egress.
  Existing photos keep their old size; this only applies to new uploads.
- **There is no server-side media processing available at all on this plan.** Any future
  optimisation — audio, video, anything — has to happen in the browser before upload, the way
  `downscaleImage` does. See `docs/plans/audio-memories.md` §0.4, where this was first worked out.

### Signed URLs live an hour, and the reason is caching

`SIGNED_URL_TTL_SECONDS` is `60 * 60`. It was five minutes, which quietly cost most of the free
plan's *cached* egress allowance: caches key on the URL, every render mints a fresh signature, so
every visit to an album page re-downloaded every thumbnail it had already fetched. An hour also
matches the default `Cache-Control: max-age=3600` Storage puts on objects, so the signature and
the cache entry now expire together.

Cheap here because the bucket is private and a signed URL only ever reaches an authenticated
session of a two-person book. **Time-capsule media is the exception** and must get its own short
TTL when that feature lands — see `docs/plans/time-capsule.md`.

`next/image` is still `unoptimized` throughout. Deliberate: Supabase already returns a
correctly-sized image, and signed URLs rotate every 5 minutes, so routing them through the
Vercel optimizer would miss its cache on every mint for no gain.

### How many URLs get signed, which is the thing that scales

Every signed URL is a Storage round trip, so `resolveMemoryMedia` costs `renditions × memories` —
the one cost on a chapter page that grows with how full a month is.

**The chapter page passes `{ full: false }` and signs thumbnails only.** The full-size URL for a
print is signed on demand by `getMemoryFullUrl` (via the `loadMemoryFullUrl` action) when that
print is lifted. Signing both up front doubled the page's Storage traffic for a URL most prints
never use, and which expires in five minutes anyway — so one minted at page load for a print
opened twenty minutes later was already dead. `MemoryDetail` shows the thumbnail it already has
while the full one is fetched, so the photo is on screen in the first frame either way.

`getMemoryFullUrl` goes back through `getChapterMemories`, not a direct row read — asking for a
locked time-capsule's media by id would otherwise be a side door around the "no raw memory reads"
invariant.

The archive still resolves both (default `full: true`): it lists soft-deleted rows, which may
have no thumbnail at all.

### What a print responds to

| Gesture | Where | What happens |
|---|---|---|
| Tap | grid print | Lifts it into `MemoryDetail` |
| Press and hold (450ms) | grid print | Opens the reaction picker — same one the corner ♡ opens |
| Tap the photo | inside `MemoryDetail` | Opens `PhotoLightbox`, the photo full-screen |
| Escape | either | Closes one layer only: lightbox first, then the memory |
| Swipe left/right, ←/→, edge arrows | inside `MemoryDetail` | Steps to the neighbouring print on the same page (no wrap-around) |

Prev/next between prints: `MemoryGrid` computes the walkable list (from a chapter it excludes
promise-cover prints, whose tap navigates to the album instead of opening a detail) and passes
`onPrev`/`onNext` into `MemoryDetail`. Swipe detection is `lib/navigation/useSwipeNavigation.ts`
(shared with `PhotoLightbox`; release-judged so it never fights vertical scroll), keyboard arrows
are ignored while typing in an input/textarea or while the lightbox is up, and the edge arrow
buttons are `hidden sm:flex` — touch gets the swipe. **The detail's `key` in `MemoryGrid` is
deliberately stable (`"memory-detail"`), not `selected.id`:** `useCloseOnBack` pushes a history
entry per mount, so a keyed remount per step would stack an entry for every print walked past.
`MemoryDetail` instead resets its per-memory state (full URL, caption draft, zoom) with a
render-time reset when `memory.id` changes.

`PhotoLightbox` takes the same optional `onPrev`/`onNext` (plus a `position` "3 of 7" marker) —
`/places`' `PlaceGallery` uses that to page through a place's photos with swipe, arrow keys, and
edge arrows. A memory's own lightbox passes none, so a lone photograph looks as it always has.

The hold is in `MemoryCard`: a timer, a 10px movement cancel (or every scroll starting on a photo
opens a picker), and a `heldRef` flag that swallows the `click` the same press ends with — without
that, reacting also lifts the print open behind the picker. `MemoryReactions`' `corner` variant
takes optional `open`/`onOpenChange` so both entry points drive one picker, and it dismisses on
outside `pointerdown` or Escape.

Every `next/image` in the album is `draggable={false}`. Native image drag fires on exactly the
press-and-hold the picker wants, and the print visibly peels off the page as a drag ghost.
`select-none` + `-webkit-touch-callout: none` on the print button suppress the OS "save image"
sheet and text selection for the same reason.

`PhotoLightbox` is the one dark surface in the book — deliberately, so a photograph shown at full
size has no warm colour cast over it. It renders *inside* `MemoryDetail` (so the memory stays
mounted underneath) and therefore stops click propagation, or one tap would close both.

### Who kept a memory

`memories.created_by` is a bare `auth.users` id, and **nothing in the schema maps one to a name** —
`relationship` holds `partner_a_name`/`partner_b_name` but no user ids. So both the grid print and
the lifted detail say "kept by you" / "kept by your partner", the same thing `MemoryComments` does
for notes, because it is the most that can be truthfully asserted. Real names need a migration
adding partner user ids to `relationship`; until then, do not guess.

### Opening a chapter

`app/(app)/chapters/[slug]/loading.tsx` renders the instant the link is tapped. It is an album
sheet with blank mounted prints in the real page's exact layout, not a spinner — the page is
already turned to, the photos just haven't developed. Read the file's own note before changing
it; the anti-spinner reasoning is an experience-direction call, not a style preference.

## Adding a photo

`components/memory/MemoryComposer.tsx`, rendered at the bottom of the album as an empty
dashed slot rather than an "Upload" button.

Two inputs only — files, and an **optional** caption. `occurred_at` is NOT NULL in the schema so
it silently takes today; an empty caption stores the date as `title`, and `MemoryCard` then skips
the caption line so the date isn't printed twice. There is deliberately no date picker and no
notes field: metadata entry is the "operating a UI" feeling this product is built to avoid.

Flow, per selected file:

1. `crypto.randomUUID()` for the memory id — needed *before* the row exists because the storage
   path convention is `chapters/{chapterId}/{memoryId}/…` (see `0002_storage.sql`).
2. Downscale to `original.{ext}` and `thumb.{ext}`, upload both straight from the browser with
   the anon-key client (storage RLS already allows authed inserts).
3. `addMemory` server action (`app/(app)/chapters/[slug]/actions.ts`) → `createMemory` in
   `lib/memories/mutations.ts`, the only writer of memory rows, then `revalidatePath`.

Selecting several photos creates one memory per photo, sharing the caption.

## Related

- `data-model.md` — why reads go through the `get_chapter_memories` RPC.
- `experience-direction.md` — the UX guardrails all of the above is written against.
