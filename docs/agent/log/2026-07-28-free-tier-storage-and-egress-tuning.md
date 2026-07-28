# 2026-07-28 — Free-tier storage & egress tuning, and three feature plans

## What prompted this

Three features were planned this session (time capsules, audio memories, bucket list). Costing the
audio one against the Supabase **free** plan turned up two facts about the *existing* image
pipeline that were worth more than anything in the feature being planned. Those got fixed; the
features themselves are still just plans.

## The free plan's actual numbers (verified 2026-07-28, supabase.com/pricing)

1 GB file storage · 5 GB egress/month · 5 GB **cached** egress/month · 500 MB database ·
50 MB max upload · **image transformations not included (Pro+ only)** · projects pause after 7 days
idle.

## Finding 1 — the read-side image transform has never run here

`getSignedUrl`'s `rendition` parameter asks Storage to resize on the way out. That's a paid add-on,
so on this plan every such request errors and takes the function's own fallback to the untransformed
original. Nothing was broken — the fallback is why pages stayed light, since `downscaleImage` had
already capped what went into the bucket — but it means **layer 2 of the "two independent layers"
described in `reading-experience.md` is inert, and layer 1 is carrying the whole thing.**

Recorded in `codebase-map/reading-experience.md` so nobody loses a day working out why `thumb` and
`full` return identical bytes.

The knock-on that matters for future work: **there is no server-side media processing on this plan
at all.** Audio, video, anything — it has to happen in the browser before upload.

## Finding 2 — a 5-minute signed-URL TTL was defeating the browser cache

Caches key on URL. Every render minted a fresh signature, so every visit to an album page
re-downloaded every thumbnail it had already fetched. The free plan grants 5 GB of *cached* egress
next to its 5 GB of egress, and the app was earning approximately none of it.

`SIGNED_URL_TTL_SECONDS`: `60 * 5` → `60 * 60`. Also matches Storage's default
`Cache-Control: max-age=3600`, so signature and cache entry now expire together.

Cheap security-wise here: private bucket, URL only ever handed to an authenticated session of a
two-person book, pointing at a row both of them can already see.

**This does not generalise to time capsules.** A capsule's media URL living an hour across an
unlock boundary is exactly the leak that design exists to prevent; it gets its own short TTL when
built.

## Change — `ORIGINAL_MAX_EDGE` 2000 → 1600

`RENDITIONS.full` in `getSignedUrl.ts` asks for 1600px and is the largest rendition anything in the
app requests, `PhotoLightbox` included. Originals were being stored at 2000. Those 400px were never
displayed on any plan: with transforms they'd be downsampled away, without them (here) the whole
file crossed the wire to be drawn at 1600.

Area scales with the square, so ≈35% off every new original in both bucket and egress. Roughly
2,400 → ~3,300 prints per gigabyte; at ~30 photos/month that moves the runway from ~6.5 to ~9 years.

**Quality left at 0.85 deliberately.** Dimension is the safe lever — nothing is displayed above
1600px, so cropping to it is lossless in practice. Re-encoding at lower quality is an irreversible
degradation of the one irreplaceable thing in this app, for maybe another 12%. Not worth it.

**Only affects new uploads.** Existing photos keep their size. Re-processing them means a script
that re-downloads, re-encodes and re-uploads every original — worth writing only if the dashboard
shows the bucket is meaningfully full. It wasn't checked this session.

## What the next session should watch out for

- The 1600 constant and the TTL are now **matched pairs** with `RENDITIONS.full` and Storage's
  `Cache-Control` respectively. Changing one without the other reintroduces exactly the waste that
  was just removed.
- `ORIGINAL_MAX_EDGE` and `THUMB_MAX_EDGE` still live inside `MemoryComposer.tsx`. The bucket-list
  plan's step 0 extracts the upload pipeline to `lib/media/uploadMemoryMedia.ts`; when that happens
  these constants move with it, and that is where they should have been.
- The audio implementation is **on hold** at the owner's direction. Its plan stands.

## Plans written this session (all `docs/plans/`, none implemented)

| Plan | The decision most likely to be undone by someone who hasn't read it |
|---|---|
| `time-capsule.md` | Don't add a `time_capsules` table — `memories.unlock_at` already exists and the RPC already filters on it. Locked rows are redacted **in SQL**, not TypeScript. |
| `audio-memories.md` | `audio_path` is a column, not `meta.audio_path`, because `purgeMemory()` enumerates storage paths by column name and would silently orphan the file. |
| `bucket-list.md` | A memory must never land in an **unrevealed** chapter — the user would tick a promise and watch the photograph vanish. `resolveTargetChapter()` falls back to the newest revealed chapter. |
