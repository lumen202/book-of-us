# Reading Experience — Chapters, Album Pages, Media

How a chapter is read, and how photos get in and out of it.

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
