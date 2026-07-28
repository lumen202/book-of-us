# Implementation Plan — Audio Memories on Polaroid Cards

**Status:** proposed, not yet built
**Author:** agent session 2026-07-28
**Touches:** `supabase/`, `lib/media/`, `lib/audio/` (new), `lib/memories/`, `components/memory/`
**Related:** [`time-capsule.md`](time-capsule.md) (same session; independent feature)

---

## 0. Orientation — what already exists, and the four constraints it imposes

### 0.1 The pieces this feature can stand on

| Piece | Where | Relevance |
|---|---|---|
| Single private bucket `memories` | `supabase/migrations/0002_storage.sql` | Audio goes in the **same bucket**, same path convention |
| Path convention | `chapters/{chapterId}/{memoryId}/…` | Audio becomes `…/voice.{ext}` beside `original.webp` |
| Client-side pre-upload optimisation | `lib/media/downscaleImage.ts` | The precedent for compressing in the browser, and *why* |
| On-demand signed URLs | `getMemoryFullUrl` / `loadMemoryFullUrl` action | Exactly the pattern the audio URL must copy |
| `meta jsonb` for sparse type fields | `memories` table | Where duration and waveform peaks belong |
| The print itself | `components/memory/MemoryCard.tsx` (244 lines) | Already has a press-and-hold gesture; audio must not collide with it |

### 0.2 Four constraints that shape every decision below

1. **Signed URLs expire in 5 minutes** (`SIGNED_URL_TTL_SECONDS` in `lib/storage/getSignedUrl.ts`).
   An audio URL minted at page load and pressed twenty minutes later is dead. Audio URLs are
   therefore minted **on press**, never at page render — the same reasoning, and the same shape, as
   the full-size photo URL described in `reading-experience.md`.
2. **`getSignedUrl`'s `rendition` transform is image-only.** Its own doc comment says so: *"Only
   pass a rendition for images — video/audio have no transform and would take the fallback path
   every time."* There is no server-side audio transcode available in this stack today. Whatever
   optimisation happens, happens **before upload**, in the browser.
3. **The album is photos-only right now.** `albumPrints()` in `lib/memories/queries.ts` filters to
   `type === "photo"`. This feature is *audio attached to a photo print*, not a new card type — so
   it slots in without touching that gate. A standalone voice-note memory (`type: "audio"` with no
   photo) is a **separate, later** feature; §1.4 keeps the schema ready for it without building it.
4. **The album page is already frame-rate sensitive.** See
   `log/2026-07-28-backdrop-compositing-and-parallax-cost.md` and
   `log/2026-07-27-emoji-reactions-and-mobile-perf.md`. A live `AnalyserNode` driving a
   requestAnimationFrame waveform on every print, over the painted garden, is exactly the kind of
   cost those sessions spent themselves clawing back. §2.4 avoids it entirely.

### 0.3 The free-tier budget — verified numbers, and what they actually constrain

Supabase Free plan, confirmed 2026-07-28 ([pricing](https://supabase.com/pricing)):

| Resource | Free limit | What this feature spends |
|---|---|---|
| File storage | **1 GB** | ~90 KB per voice clip |
| Egress | **5 GB/month** | ~90 KB per *play*, not per page view |
| Cached egress | 5 GB/month | See §0.4 — currently earning almost none of this |
| Database | 500 MB | ~200 bytes per clip (`audio_peaks`) |
| Max upload | 50 MB | Never approached; §3.2 caps at 8 MB |
| Image transformations | **Not included — Pro+ only** | See §0.4 |
| Inactivity | Project paused after 7 days | Unrelated, but worth knowing |

**The first conclusion is that audio is not the thing to optimise hardest.** Run the numbers
against the 1 GB ceiling:

| Item | Bytes stored | Items per 1 GB |
|---|---|---|
| One photo print (`original.webp` ~350 KB + `thumb.webp` ~70 KB) | **~420 KB** | ~2,400 |
| One 30s voice clip @ 24kbps mono Opus | **~90 KB** | ~11,600 |

A photo costs **4–5× what a voice clip costs**, and every print pays it while only some prints will
ever carry a voice. At ~30 photos a month the bucket fills in roughly **6 years** — which is short
for a book explicitly designed to accumulate for decades, and it is a photo problem, not an audio
one. §0.4 and §3.4 are written accordingly: keep audio genuinely cheap, but do not contort the
feature to save kilobytes while the real ceiling sits elsewhere.

**The database is a non-issue.** 40 peak integers is ~200 bytes; 10,000 memories is ~2 MB against a
500 MB limit. Storing peaks in `meta` rather than as a sidecar file in the bucket is therefore
strictly correct on free tier — it moves cost from the scarce resource (storage, egress) to the
abundant one (database rows), and it eliminates a second signed-URL round trip per print.

### 0.4 Two free-tier findings that affect the whole app, not just this feature

Both were found while costing this feature. Neither is caused by it, and both are worth more than
anything audio-specific below.

**(a) `getSignedUrl`'s image transform does nothing on this plan.** Image transformations are Pro+
only. The function's own comment anticipates this — *"a failure here falls back to the
untransformed original rather than rendering nothing"* — so behaviour is correct and pages are not
broken. But it means **the read-side layer of the two-layer image strategy in
`reading-experience.md` is currently inert**, and 100% of weight control comes from
`downscaleImage` at write time. The graceful fallback is doing real work here: it serves
`thumb.webp` (already 720px) for grid prints and `original.webp` (already ≤2000px) for the lifted
view, so the pages stay light *because the write side capped them*, not because the transform ran.

Implication for this plan: **there is no server-side audio processing available either.** §3.4's
"compress at the source or not at all" is not a preference, it is the only option this plan has.
Update `reading-experience.md` to say the read layer is inactive on the current plan, so a future
session doesn't spend a day debugging why `rendition` seems to have no effect.

**(b) The 5-minute signed-URL TTL is quietly costing most of the cached-egress allowance.**
`SIGNED_URL_TTL_SECONDS = 60 * 5` means every page render mints a **new URL** for the same object.
Browser and CDN caches key on URL, so a new signature is a guaranteed cache miss: opening the same
album page ten times downloads the same thirty thumbnails ten times. The free plan grants 5 GB of
*cached* egress alongside 5 GB of egress, and at a 5-minute TTL the app earns almost none of it.

**Recommended change (outside this feature, higher value than anything in it):** raise the TTL for
thumbnails to ~1 hour. The security argument for 5 minutes is thin here — the bucket is private,
the URL is only ever handed to an authenticated session of a two-person book, and the row it points
at is already visible to both of them. An hour turns repeat visits within a session into cache hits.

Keep the short TTL only where it is actually load-bearing: **a time-capsule's media** (see
[`time-capsule.md`](time-capsule.md)), where a long-lived URL minted near an unlock boundary is
exactly the leak that plan is built to prevent.

This is an efficiency issue rather than a defect, so it is recorded here rather than filed under
`docs/agent/bugs/` — but it deserves its own commit and its own log entry, independent of audio.

---

## Phase 1 — Storage bucket & schema updates

### 1.1 Bucket: no change

One private bucket, one path convention, extended by one filename:

```
chapters/{chapterId}/{memoryId}/original.webp
chapters/{chapterId}/{memoryId}/thumb.webp
chapters/{chapterId}/{memoryId}/voice.webm      ← new
```

The existing `memories_bucket_select/insert/update` policies are `bucket_id`-scoped, not
extension-scoped, so they already cover audio with no policy change. **Do not create a second
bucket.** `0002_storage.sql` states the one-bucket rule and its reasoning; a `voices` bucket would
fork the signing helper, the RLS policies and the purge path to gain nothing.

**Worth adding while here:** a size cap on the bucket if the plan supports it, or at minimum a
documented cap enforced client-side (§3.2). Nothing today stops a 200 MB upload.

### 1.2 Migration `0005_audio.sql` — one column, deliberately not `meta`

```sql
alter table memories add column audio_path text;
```

**Why a column and not `meta.audio_path`,** given that `data-model.md` says sparse type-specific
fields belong in `meta`: that rule is about *descriptive* fields (width, duration, artist, city).
A storage path is **structural** — three separate systems enumerate storage paths by column name:

- `purgeMemory()` in `lib/memories/mutations.ts` selects `storage_path, thumbnail_path` and deletes
  those objects before the row. A path hidden in `meta` is a **file the purge silently orphans**,
  in the one code path in the app that is allowed to delete anything.
- `resolveMemoryMedia()` signs by column.
- The backup/export script walks the same fields.

A jsonb key would have to be special-cased in each. The column is the smaller change, and the purge
argument alone decides it. **`purgeMemory` must be updated in the same commit** — that is the one
edit in this whole plan that touches the hard-delete exception, so it gets its own review pass.

Descriptive audio fields **do** go in `meta`, per the existing rule:

```jsonc
meta: {
  width: 2000, height: 1500,          // existing
  audio_duration_ms: 8420,            // new — for the "0:08" label with no file loaded
  audio_peaks: [4, 19, 62, 71, …],    // new — see §2.4, ~40 ints, 0–100
  audio_mime: "audio/webm;codecs=opus" // new — for the cross-browser fallback in §3.4
}
```

`audio_peaks` at 40 int8-ish values is a few hundred bytes of JSON per row. That is the entire cost
of never running an analyser at read time.

### 1.3 Types and queries

- `lib/memories/types.ts` — add `audio_path: string | null` to `Memory`.
- `lib/memories/queries.ts` —
  - `MemoryWithMedia` gains **`hasAudio: boolean`**, not `audioUrl`. The grid must know a print has
    a voice on it (to draw the button and the waveform from `meta`) without signing a URL for it.
    Deriving a boolean costs nothing; signing costs a round trip per print.
  - **Do not** add audio signing to `resolveMemoryMedia`. That function's own doc comment explains
    that its cost is `renditions × memories` and that this is the one thing on a chapter page that
    grows with how full a month is. Adding a third rendition to every print, for a clip most
    visitors never play, walks straight back into the problem the `{ full: false }` change solved.
  - New `getMemoryAudioUrl(chapterId, memoryId)` — modelled line-for-line on `getMemoryFullUrl`,
    including going **back through `getChapterMemories`** rather than reading the row by id. That
    detour is not incidental: it is what stops a locked time-capsule's audio being fetched by
    asking for it directly. Same side door, same lock.
- `app/(app)/chapters/[slug]/actions.ts` — `loadMemoryAudioUrl(memoryId)` server action, mirroring
  the existing `loadMemoryFullUrl`.

### 1.4 Keeping the door open for standalone voice notes

`type: "audio"` already exists in the `memories` check constraint. A voice note with no photo would
be an `audio`-typed row with `audio_path` set and `storage_path` null. Nothing in this plan blocks
that, and `albumPrints()` is still the one-line gate that would let it onto the page. **Do not
build it now** — it needs its own card design, and a half-designed one becomes the placeholder card
that `reading-experience.md` explicitly refuses to render.

---

## Phase 2 — The custom React audio player

### 2.1 The central decision: one shared `<audio>` element, owned outside React

`lib/audio/audioBus.ts` — a module-level singleton, not a React context, not one element per card.

```
audioBus
  ├─ a single HTMLAudioElement, created lazily on first user gesture
  ├─ play(memoryId, urlLoader)  — swaps src, plays, notifies subscribers
  ├─ pause() / toggle(memoryId)
  ├─ subscribe(fn) → unsubscribe   — for useSyncExternalStore
  └─ state: { memoryId, status: idle|loading|playing|paused, currentTime, duration }
```

**Why one element rather than one per card — four reasons, in order of weight:**

1. **"Auto-pause the other clip" stops being a feature and becomes a structural impossibility.**
   With N elements, the requirement is a coordination problem you can regress; with one, there is
   no second thing that can be playing. This is the requirement, solved by construction.
2. **iOS gesture unlocking.** Mobile Safari will only play audio from an element that has been
   played inside a user gesture at least once. One long-lived element, unlocked on the first tap,
   plays freely thereafter. N lazily-mounted elements each need their own gesture — and the first
   tap on each card is spent on unlocking rather than on playing.
3. **Playback survives unmount.** A print plays in the grid, the user taps it, `MemoryDetail`
   mounts, the grid card may re-render or unmount. With per-card elements the audio cuts off
   mid-word. With the bus, the sound is continuous and both surfaces just subscribe to the same
   state — the grid button and the detail button are two views of one truth.
4. Mobile browsers cap concurrent media elements; an album page with 30 prints would blow past it.

**React binding:** `lib/audio/useAudioPlayer.ts` wrapping `useSyncExternalStore` over the bus.
`useSyncExternalStore` specifically — it is the React 19 API for exactly this (an external mutable
source), and it gets tearing and SSR-snapshot handling right, which a `useEffect` + `useState`
subscription does not. The server snapshot is the idle state, so SSR and first client paint match.

### 2.2 URL loading is the bus's job, lazily

`play()` takes a **loader function**, not a URL: `() => loadMemoryAudioUrl(memoryId)`.

- Nothing is signed until the press.
- The bus caches `{ memoryId → { url, mintedAt } }` and re-mints when older than ~4 minutes
  (under the 5-minute TTL, with margin). Replaying the same clip twice in a row costs one round
  trip, not two.
- **On an `error` event with an already-loaded src, re-mint once and retry**, then surface a
  failure. An expired signature is the single most likely runtime failure of this feature, and a
  play button that does nothing is indistinguishable from a broken one.
- `status: "loading"` exists precisely to cover this round trip. It is a state of the *button*
  (§3.3 of the animation section), never a spinner — `loading.tsx`'s anti-spinner note applies.

### 2.3 `AudioMemoryPlayer` component

`components/memory/AudioMemoryPlayer.tsx`, client, two variants matching `MemoryReactions`'
established `corner` / `inline` pattern:

| Variant | Where | Shape |
|---|---|---|
| `stamp` | on the print, in the caption strip under the photo | Small round play button + a 40-bar waveform, ~20px tall |
| `inline` | inside `MemoryDetail` | Larger, with elapsed/total time and a scrubbable waveform |

Props: `memoryId`, `chapterSlug`, `durationMs`, `peaks: number[]`, `variant`. **No URL prop** — the
component never sees a signed URL until the bus hands one over. That keeps the "signed URLs are
minted on demand server-side" invariant true at the component boundary, not just by convention.

### 2.4 The waveform: precomputed at upload, drawn as static SVG

The peaks are computed **once, in the browser, at upload time** (§3.3) and stored in `meta`. At read
time the component renders 40 `<rect>`s from that array — no `AudioContext`, no `AnalyserNode`, no
`requestAnimationFrame`, no audio file loaded at all.

- Progress is a single CSS `clip-path: inset(0 X% 0 0)` on a duplicate, accent-coloured copy of the
  bars, `X` driven by `currentTime / duration`. One style property mutating per frame, on one
  element, on one card — versus an analyser and a canvas per print.
- The waveform is therefore visible and correct **before anything is played**, which is the point:
  the print shows it has a voice on it without costing a byte.
- Bars are drawn as thin rounded strokes in `--color-ink` at low opacity, filling with `--color-accent`
  as it plays. No true grey (`theming.md`).

**A live analyser is the obvious implementation and it is the wrong one here** — see constraint
0.4. If a genuinely reactive visualisation is wanted later, it belongs in `MemoryDetail` only (one
at a time, full attention), never on the grid.

---

## Phase 3 — Upload pipeline & compression strategy

### 3.1 Two entry points, one pipeline

1. **Attach a file** — the `.mp3`/`.m4a` case in the requirements. Extends `MemoryComposer`.
2. **Record in the browser** — `MediaRecorder` + `getUserMedia`, as a hold-to-speak gesture in the
   composer. Strongly recommended as the *primary* path: a voice recorded into the page in the
   moment is the thing this product is actually for, and it is also the path where compression is
   free (§3.4). Attaching a file is the fallback for audio that already exists. **See §3.7 for the
   interaction design.**

Both converge on: **validate → decode → measure duration → compute peaks → (maybe re-encode) →
upload to `…/voice.{ext}` → `addMemory`/`attachAudio` with paths + meta.**

### 3.2 Validation, client-side, before anything touches the network

| Check | Limit | Failure copy (story language, not error codes) |
|---|---|---|
| MIME/extension | `audio/mpeg`, `audio/mp4`, `audio/m4a`, `audio/webm`, `audio/ogg`, `audio/wav` | "That doesn't look like a sound file." |
| File size | ≤ 8 MB pre-processing (a 30s clip is never near this; the cap exists to stop a 40-minute upload starting at all) | "That one's too big to tuck in." |
| **Duration** | ≤ 30s, checked by decoding, **not** by trusting file size | "Keep it under half a minute — just the moment." |

Duration must be measured by actually decoding (`AudioContext.decodeAudioData`, or an offscreen
`<audio>` + `loadedmetadata`), because bitrate makes size a useless proxy. Do this **before**
upload, so an over-long clip never reaches the bucket. Consider offering to **trim to the first 30
seconds** rather than rejecting — kinder, and one fewer dead end.

### 3.3 Peak extraction (runs on every path)

```
decodeAudioData(arrayBuffer)
  → getChannelData(0)
  → 40 buckets, RMS (not peak-max) per bucket
  → normalise to 0–100, round to int
```

RMS rather than absolute max: max-per-bucket on a phone recording produces a nearly flat bar of
clipping spikes, which reads as noise rather than as speech. Normalise against the loudest bucket so
a quiet recording still draws a full-height waveform.

Cost: decoding 30s of audio is tens of milliseconds. Fine on the client, **not** worth an
AudioWorklet.

### 3.4 Compression — the honest analysis, and the recommendation

**Establish the actual numbers first.** A 30-second clip:

| Source | Typical size |
|---|---|
| iPhone voice memo (`.m4a`, AAC 32kbps mono) | ~120 KB |
| Music-app `.mp3` (128–320kbps stereo) | 500 KB – 1.2 MB |
| `MediaRecorder` Opus @ 24kbps mono | **~90 KB** |
| Uncompressed WAV | ~5 MB |

Compare against the photo problem `downscaleImage` was built for: 4–8 MB, on every print, on every
page. **Audio is one to two orders of magnitude cheaper, capped at 30 seconds, and attached to a
minority of prints.** Treating it with the same urgency would be misreading the situation.

**The browser also cannot natively re-encode to MP3 or AAC.** There is no encoder in the platform
for those. The options are:

| Option | Verdict |
|---|---|
| Ship an MP3 encoder WASM (`lamejs` et al.) | **No.** ~150 KB of WASM in the client bundle of a two-person app, to save ~200 KB per clip, on a page already fighting for mobile frame budget. The bundle costs more than the feature saves within the first few visits. |
| Route decoded audio through `MediaStreamDestination` + `MediaRecorder` | **No.** It re-encodes in *real time* — 30 seconds of clip means 30 seconds of waiting. |
| Server-side transcode (Supabase Edge Function + ffmpeg) | **Deferred.** Correct long-term answer, real infrastructure cost, and no evidence yet that it's needed. |
| **Recommended:** record at a low bitrate; store uploaded files as-is after validation | ✅ |

**The recommendation, tuned for the 1 GB free tier (§0.3):**

- **Recorded audio — `audioBitsPerSecond: 20000`, mono.** `new MediaRecorder(stream, { audioBitsPerSecond: 20000 })`
  plus `getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })`.
  Opus is designed for speech at this bitrate and stays clean; 20kbps mono puts a 30s clip at
  **~75 KB**, and the noise suppression matters more for perceived quality at low bitrate than the
  extra 4kbps would. Compression is free, native, and produces the smallest file in the table.
  *Do not go below ~16kbps* — that is where voices start sounding processed, and a voice sounding
  wrong defeats the entire point of storing it.
- **Uploaded files — validate, extract peaks, store as-is, with two hard gates:**
  - **Reject WAV and any file over ~2 MB post-validation** (rather than the 8 MB pre-check). At 30
    seconds, anything above 2 MB is uncompressed or wildly over-bitrated, and it is a single file
    costing 1/500th of the entire bucket. Reject with a line offering the recorder instead — which
    is the better path anyway.
  - **Never store a second rendition.** Photos store `original` + `thumb`; audio stores exactly one
    file. There is no audio equivalent of a thumbnail, `meta.audio_peaks` *is* the preview, and it
    lives in the database where space is abundant.
- **Store `meta.audio_bytes` at upload.** It costs 8 bytes per row and makes the bucket's contents
  queryable in SQL — `select sum((meta->>'audio_bytes')::bigint) from memories` answers "how much of
  the gigabyte have we spent" without walking Storage. Do the same for images in the same commit
  (`meta.image_bytes`); the photo number is the one that will actually move.
- **Write down the trigger for revisiting:** at **700 MB of bucket usage** (70% of the free plan),
  revisit — and note that the first thing to look at will almost certainly be photos, not audio
  (§0.3). Options at that point, cheapest first: lower `ORIGINAL_MAX_EDGE` from 2000 (nothing in the
  app displays more than 1600px, per `getSignedUrl`'s own `RENDITIONS` comment), then an Edge
  Function transcode, then the $25 Pro plan. Put that number in `codebase-map/` so the decision is
  re-litigated by evidence rather than by whoever next reads this file and feels uneasy.

**Egress, which is the limit this feature is more likely to touch than storage.** 5 GB/month, and
audio is only fetched **on press** (§1.3, §2.2) — not per page view. Two people playing 20 clips a
day is 20 × 75 KB × 30 ≈ **45 MB/month**, under 1% of the allowance. The design that keeps it there
is `hasAudio` being a boolean rather than a signed URL; the moment audio starts being signed at
page render, this becomes a per-visit cost instead of a per-play one. That is the line to hold.

### 3.5 The cross-browser format trap — resolve this before writing the recorder

`MediaRecorder` output format is **browser-dependent**: Chrome/Firefox produce `audio/webm;codecs=opus`,
Safari produces `audio/mp4` (AAC). This book has two people who may be on different platforms, and
a recording that is silent on the other person's phone is a total feature failure that will not
show up in single-device testing.

**Run this spike before building anything in Phase 3:** record a clip in Chrome on Android, play it
in Safari on iOS, and vice versa. Then pick:

- **If both play** — store as-is, keep `meta.audio_mime` for diagnosis, ship it.
- **If they don't** — the fallback is `MediaRecorder.isTypeSupported()` negotiation down to a
  common format, and if none exists, the Edge Function transcode from §3.4 stops being deferred and
  becomes Phase 3's actual work.

Do not assume either outcome from documentation, including this document. Test on the two real
devices this app is used on.

### 3.6 Composer integration

Extend `MemoryComposer` — do not build a second composer. `experience-direction.md` names metadata
fields as "the thing to resist here", and the composer's own doc comment defends its two-input
design. So the audio affordance is **one optional control**, off by default, presented as *"add a
voice to this"* with a microphone glyph — not a file input row.

Upload order matters: **image first, then audio, then the row.** If the audio upload fails, the
photo is already in the bucket and the flow can either save the print without its voice or retry;
writing the row first would leave a row pointing at a file that isn't there. The composer already
loops per file and writes the row last — keep that shape.

`attachAudio(memoryId, path, meta)` as a separate mutation in `lib/memories/mutations.ts` lets a
voice be added to an *existing* print later, which is the more likely real use ("I found the
recording from that night"). Same soft-delete rules; `detachAudio` nulls the column and leaves the
object in the bucket for the service-role reaper, exactly as `softDeleteMemory` does.

### 3.7 The recorder interaction — hold to speak

`components/memory/VoiceRecorder.tsx`. The Messenger/WhatsApp voice-message gesture is the right
reference **because it is the one gesture everyone already knows**, and this product's whole
argument is that people should not have to learn a UI. Borrow the mechanics; do not borrow the
chrome.

**The gesture, in beats:**

| Beat | What happens |
|---|---|
| Idle | A microphone glyph in the composer. One object, no fields. |
| Press and hold | Permission prompt on first ever use, then recording starts. The glyph swells; a live level ring breathes around it, driven by the input volume. |
| While holding | Elapsed time counts up. **A 30-second arc draws around the button** — the cap is visible as it approaches, so it is never a surprise. |
| Slide away and release | **Cancel.** The classic slide-to-cancel, with a "release to discard" line appearing as the finger travels. |
| Release in place | Recording stops, and the clip goes to **review**, not straight to save (below). |
| 30s reached | Recording stops itself and goes to review. Never truncates mid-upload; never silently keeps going. |

**Three places to deliberately diverge from Messenger:**

1. **Review before save.** Messenger sends on release, because a chat message is disposable. A
   memory in this book is not — it is being tucked onto a print that will be re-read for years.
   So release lands on a small review state: play it back, keep it, or record again. One extra tap,
   and it converts "I fumbled the first three words" from a permanent artifact into a retake.
2. **Tap-to-toggle as well as hold**, not hold-only. Holding a phone still for 30 seconds while
   speaking is genuinely awkward, and it is an accessibility failure for anyone who can't sustain a
   press. Hold is the fast path; a short tap starts recording and a second tap stops it. Both end in
   the same review state.
3. **No waveform scrubbing during recording.** Draw the live level ring, not a scrolling waveform —
   the real waveform is computed at the end (§3.3) and belongs to the finished clip. A live
   scrolling waveform is a `requestAnimationFrame` loop on a page that has already paid for its
   frame budget twice (constraint 0.4).

**Technical notes for this component specifically:**

- `getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })` —
  mono at the source, so §3.4's bitrate saving is real rather than a stereo stream squeezed.
- The live level ring reads from an `AnalyserNode` on the **input** stream. This is the one place an
  analyser is justified: exactly one exists, only while recording, and it is torn down on stop. It
  is not the read-path analyser §2.4 rejects.
- **Always `stream.getTracks().forEach(t => t.stop())` on stop, cancel, unmount, and error.** A live
  microphone track left running leaves the browser's recording indicator lit, which on a private
  app between two people is a genuinely alarming thing to leave switched on.
- Permission denied → a single honest line ("The browser wouldn't let me listen — you can still
  attach a recording from your phone") that falls back to the file-attach path from §3.1. Never a
  dead end.
- `MediaRecorder` chunks arrive via `ondataavailable`; collect and `new Blob(chunks, { type })` on
  stop. Feed that blob into the **same** pipeline as an attached file (§3.2 → §3.3 → upload), so
  validation, peak extraction and upload have exactly one implementation.
- Desktop and mobile share the component. On desktop, hold-to-record with a mouse is fine but tap-to-
  toggle will be the one people actually use — which is another reason it isn't optional.

**Edge cases to add to §4.4:**

- [ ] Recording while a clip is playing → the bus pauses playback first. Never record over your own
      audio output.
- [ ] Permission granted, then revoked in browser settings mid-session → clean failure, no hang.
- [ ] Another app seizes the microphone (a call comes in) → recording stops, whatever was captured
      goes to review rather than being lost.
- [ ] Navigating away mid-recording → tracks stopped, nothing uploaded, no orphaned object.
- [ ] Release after <1s (an accidental tap) → discarded silently with a gentle "hold a little
      longer" rather than saving a 200ms clip.
- [ ] Reduced motion → the level ring stops pulsing; the elapsed count and the 30s arc still convey
      progress.

---

## Phase 4 — UI integration with polaroid cards & UX edge cases

### 4.1 Where the button goes on the print

Below the photo, in the caption strip — **inside the white mat, not floating over the photograph.**
The mat is where a real polaroid carries writing; the image area is the photograph and stays clean.
It sits on the opposite side from the reactions sticker so the two never crowd.

`MemoryCard`'s structural note already warns that nested buttons are invalid HTML and break
keyboard access — the remove control is a *sibling* of the lift button for that reason. **The audio
button must be a sibling too**, not a child of the print button. Getting this wrong means either
invalid markup or a play button that lifts the print open behind it.

### 4.2 The gesture collision — the one integration risk that matters

`MemoryCard` already binds a 450ms press-and-hold with a 10px slop cancel, and uses a `heldRef` to
swallow the trailing `click`. Three gestures now share one card: tap-to-lift, hold-to-react,
tap-the-audio-button-to-play.

**Resolution:** the audio button `stopPropagation()`s on `pointerdown` **and** `click`, so a press
that starts on it never reaches the print's hold timer at all. Verify explicitly that:

- pressing and holding *on the audio button* does not open the reaction picker;
- a tap on the audio button does not lift the print;
- a tap on the print still lifts it while audio is playing, and **playback continues** (§2.1, reason 3).

This is the single most likely place this feature breaks something that already works. Test it
before anything else in Phase 4.

### 4.3 Play/pause transitions and the "sound is happening" indicator

- **Idle** → play triangle, waveform at rest in ink.
- **Press** → the glyph morphs triangle→pause via a Framer Motion path/opacity cross-fade over
  ~180ms. Not a hard swap; the whole album is built on things that lift and settle.
- **Loading** (the signed-URL round trip) → the button's ring draws itself around once. Typically
  under 300ms, so most presses never see it; when the network is slow it reads as *winding up*
  rather than as a spinner.
- **Playing** → the waveform fills with `--color-accent` left-to-right, and a soft warm halo behind
  the button breathes at ~1.4s. The breath is the "pulsing sound indicator" — deliberately **slow**,
  because it sits over the painted garden and a fast pulse there reads as an alert.
- **Ends** → fill drains back over ~400ms and the glyph returns to a triangle. It does not snap.
- **Reduced motion** (`ReducedMotionConfig` is already global) → no morph, no breath, no drain: the
  glyph swaps, the fill jumps in steps rather than continuously. Progress is still legible, per the
  AGENTS.md rule that reduced-motion users keep semantic pacing.
- **Celebration Mode** → the button lives on a `.scene-card` print, so ink stays dark on light
  paper. Do **not** add audio tokens to the `data-celebration` block — `celebration-mode.md` is
  explicit that UI tokens stay out of it.

### 4.4 Edge cases — the checklist

**Playback coordination (the stated requirement)**

- [ ] Playing clip B while A plays → A stops **immediately**, no overlap, no fade collision.
- [ ] The same clip's button in the grid and in `MemoryDetail` show the same state simultaneously.
- [ ] Opening `MemoryDetail` on a playing print does not restart or interrupt it.
- [ ] Closing the detail leaves the audio playing and the grid button correctly showing "playing".
- [ ] Navigating to another chapter stops playback (bus teardown on route change) — audio must not
      follow the user across pages.
- [ ] Opening `PhotoLightbox` over a playing clip: decide and implement one behaviour (recommended:
      keep playing — the voice belongs to the photo you are now looking at full-screen).

**Browser and device**

- [ ] iOS: first tap plays. Confirm the gesture-unlock path actually works on a real iPhone.
- [ ] iOS silent switch: audio is silent with no visible error. **Detect what you can and say
      something honest** — after `play()` resolves, if `currentTime` hasn't advanced after ~400ms,
      show a quiet "check your ringer switch" line. Do not fail silently.
- [ ] Headphones unplugged mid-play → the browser pauses; the `pause` event must sync the bus state
      (never trust React state as the source of truth about the element).
- [ ] Autoplay policy: nothing ever auto-plays. Confirm no code path calls `play()` outside a
      gesture.
- [ ] Backgrounding the tab / locking the phone mid-clip → state is coherent on return.
- [ ] Cross-browser playback of a recorded clip (§3.5) — Android Chrome ↔ iOS Safari, both ways.

**Data and failure**

- [ ] Signed URL expired (leave the page open >5 min, then press) → re-mints and plays. **The most
      likely runtime failure; test it deliberately.**
- [ ] `audio_path` set but the object is missing from the bucket → button shows a failed state, the
      print still renders normally.
- [ ] A print with no audio renders **no button and no empty waveform** — absence is absence, not a
      disabled control.
- [ ] Soft-deleted memory with audio: gone from the album, restorable with its voice intact.
- [ ] `purgeMemory` deletes `voice.*` along with `original.*` and `thumb.*`. **Verify by listing the
      bucket folder after a purge** — this is the orphaned-file case from §1.2 and it is invisible
      unless checked directly.
- [ ] A locked time-capsule's audio cannot be fetched by calling `loadMemoryAudioUrl` with its id
      (it goes through `getChapterMemories`; confirm).
- [ ] Corrupt/undecodable file at upload → rejected with human copy, nothing written to the bucket.
- [ ] `meta.audio_peaks` missing on an older row → the player falls back to a flat placeholder
      waveform and still plays. Never crash on absent meta.

**Accessibility**

- [ ] Button is a real `<button>` with `aria-label="Play the voice on this memory"` /
      `"Pause"`, reachable by keyboard, visible focus ring.
- [ ] Space/Enter toggles playback; the waveform is `aria-hidden` (it is decoration — the duration
      label is the accessible information).
- [ ] Elapsed time is **not** in a live region. A per-second announcement is hostile.
- [ ] Duration is announced as "8 seconds", not "0:08".

**Performance**

- [ ] An album page of 30 prints with 10 audio memories: no additional signed-URL requests at page
      load (`hasAudio` is a boolean, §1.3). Verify in the network panel — **zero** audio requests
      until a press.
- [ ] Scrolling that page on a mid-range Android holds frame rate with a clip playing. This is the
      claim §2.4's static-SVG design is making; measure it rather than assume it.

**Free-tier budget (§0.3)**

- [ ] A 30s recorded clip lands in the bucket at **≤100 KB**. Check the actual object size in the
      Supabase dashboard, not the theoretical bitrate — if it is 300 KB, the mono constraint or the
      bitrate hint silently didn't apply, which is the failure mode that costs the gigabyte.
- [ ] Exactly **one** object per voice memory. Confirm no `voice-thumb`, no duplicate, no
      leftover from a retake in the recorder's review state (§3.7) — a discarded take must never
      have been uploaded in the first place.
- [ ] A WAV / >2 MB upload is rejected **before** any bucket write.
- [ ] `meta.audio_bytes` matches the real object size, so the SQL usage query is trustworthy.
- [ ] Playing a clip twice within a minute mints **one** signed URL, not two (§2.2's cache).
- [ ] Page load with 10 audio prints does zero audio egress (already above, and it is the single
      most important egress line in this plan).

### 4.5 Docs to update when this ships (required by AGENTS.md)

- [ ] `docs/agent/codebase-map/reading-experience.md` — extend "Image weight — two independent
      layers" with the audio pipeline, add a row to "What a print responds to", and update the
      "Adding a photo" flow.
- [ ] `docs/agent/codebase-map/data-model.md` — the `audio_path` column and **why it is a column
      rather than `meta`** (the purge argument). That reasoning is the thing a future session will
      otherwise undo.
- [ ] New `docs/agent/codebase-map/audio-memories.md` if the bus grows beyond a page of
      explanation; otherwise fold it into `reading-experience.md`. Don't create a stub either way.
- [ ] `docs/agent/log/2026-XX-XX-audio-memories.md` + a row in `log/INDEX.md`.
- [ ] Record the §3.5 spike result and the §3.4 "revisit at 700 MB" trigger somewhere durable —
      both are decisions whose *reasoning* is more valuable than their outcome.
- [ ] **`reading-experience.md`: state that the read-side image transform is inactive on the free
      plan** (§0.4a), so a future session doesn't lose a day to `rendition` appearing to do nothing.
- [ ] The signed-URL TTL change (§0.4b) is **its own commit and its own log entry**, not folded
      into this feature — it changes behaviour app-wide.

---

## Build order (suggested commits)

0. **Spike first, no commit:** §3.5 cross-browser recording test on the two real devices. Its
   outcome decides whether Phase 3 is "validate and store" or "build a transcode function". Nothing
   else should be built before that is known.
1. `0005_audio.sql` + `audio_path` in types + **`purgeMemory` updated** + `hasAudio` in
   `resolveMemoryMedia` + `getMemoryAudioUrl` + the server action. Verify the purge deletes all
   three objects.
2. `lib/media/extractAudioPeaks.ts` + validation helpers, standalone and testable in isolation.
3. `lib/audio/audioBus.ts` + `useAudioPlayer`. Verify with two hard-coded clips on a scratch page:
   single-playback, unmount survival, iOS unlock. **Before any styling.**
4. `AudioMemoryPlayer` with the static waveform, `stamp` variant only.
5. Wire into `MemoryCard`. Run §4.2's three gesture-collision checks immediately.
6. Composer: `VoiceRecorder` (§3.7) first, then the attach-a-file path. The recorder is the primary
   entry point and the one with the device permissions, so it earns the earlier commit.
7. `inline` variant in `MemoryDetail`, scrubbing, polish, reduced-motion pass.
8. Docs.

Steps 3 and 5 carry the risk. Step 3 is where the architecture is proven or disproven, and step 5
is where this feature could break the press-and-hold gesture that already works — do both while the
diff is small enough to read.
