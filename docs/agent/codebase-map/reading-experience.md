# Reading Experience — Chapters, Album Pages, Media

How a chapter is read, and how photos get in and out of it.

## Chapters unlock one per monthsary

Chapter one is the month the relationship started (`relationship.started_at`) — visible from day
one, not gated behind waiting for a monthsary to pass. Each monthsary after that unlocks one more,
oldest-first. The total unlocked is `getElapsedMonthsaries(relationship.started_at, now) + 1`
(`lib/relationship/nextChapter.ts` for `getElapsedMonthsaries`, `lib/chapters/queries.ts` for the
`+ 1`) — `getElapsedMonthsaries` counts how many 5ths have passed *after* the start month, day-
of-month aware (unlike `getMonthsaryNumber` in `monthsary.ts`, which is a raw year/month
subtraction only safe to call *on* the 5th; this one is safe on any day).

**A chapter's own `month` field is a label, not an unlock date.** Nothing compares it to today.
This matters because a chapter could in principle predate the relationship's official start (a
"how we met" backstory) — an earlier version of this seed data did exactly that and it was wrong
for a different reason: it's confusing to see a chapter "unlock" that's dated before the
relationship existed. The current seed has exactly one chapter, for the start month itself, titled
with the date rather than a phrase (`"June 2026"`, not `"Where It Began"`) — see
`supabase/seed.sql`. Future chapters get added for real as they're written, not pre-seeded
speculatively; nothing pre-generates placeholder rows for months that haven't happened.

`lib/chapters/queries.ts`'s `listRevealedChapters()` is the single gate: `listChapters()` (shelf)
and `getChapterBySlug()` (direct route) both go through it, so an unlocked-later chapter is
invisible on the shelf *and* 404s if its slug is guessed or bookmarked ahead of time. It's
application-code filtering, not RLS/RPC-enforced like memory time capsules (see `data-model.md`)
— this is pacing between two people who already see the same shared book, not a security boundary.

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
  that's also what gates the remove control. `MemoryCard` shows a small "N notes" count next to
  the date so a print with notes is discoverable from the grid without opening it.

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
   (original ≤2000px, thumb ≤720px, WebP where supported, EXIF orientation applied via
   `createImageBitmap(…, { imageOrientation: "from-image" })`). The full-size original never
   reaches the bucket. This runs client-side because a Server Action body cap sits well below
   phone-photo size.
2. **Read side** — `lib/storage/getSignedUrl.ts` takes an optional `rendition` (`thumb`/`full`)
   and asks Supabase to resize as it serves. That transform is a paid Storage add-on; if it
   errors, the call **falls back to the untransformed original** rather than returning null, so
   the page gets heavier but never breaks. Only pass a rendition for images — video/audio would
   take the fallback path on every request.

`next/image` is still `unoptimized` throughout. Deliberate: Supabase already returns a
correctly-sized image, and signed URLs rotate every 5 minutes, so routing them through the
Vercel optimizer would miss its cache on every mint for no gain.

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
