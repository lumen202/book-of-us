# Emoji reactions, mobile performance chase, and a scroll-flash fix

Session covered three unrelated things; noting them separately since they'll be searched for
separately.

## Emoji reactions on photos

New `memory_reactions` table (`supabase/migrations/0003_reactions.sql`, **not yet applied** —
run it in the Supabase SQL editor before this ships), one row per `(memory_id, user_id)`, same
shape as every other mutable table: soft delete via `deleted_at`, RLS with no DELETE policy,
`updated_at` trigger. "Un-reacting" upserts/updates rather than deleting the row — see the
"no hard deletes" invariant in `overview.md`, which this does not get an exception from.

`lib/reactions/` (`types.ts`, `queries.ts`, `mutations.ts`) follows the same split as
`lib/memories/`. Reads go straight to the table (not through an RPC) because reactions aren't
time-capsule-gated content — the "no raw memory reads" invariant in `data-model.md` is scoped to
the `memories` table's own read path specifically, not every table that references it.

Deliberately **not** Facebook's stock six reactions — picked five that fit a two-person memory
book instead (`REACTION_EMOJIS` in `lib/reactions/types.ts`): ❤️ 😂 🥹 😮 😍. No "Like" (redundant
with the rest), no "Angry" (wrong app for it).

Also deliberately **not** attributed by name in the UI — reactions are aggregated by emoji, not
shown as "Joshua reacted ❤️". With only two people in the book, who reacted is rarely the
interesting part, and per-person avatars would have been the first genuinely app-like widget on
the page. `MemoryReactions.tsx` has two variants: `corner` (a small sticker + tap-to-reveal picker
on each grid print, in the same visual language as the existing remove-× control) and `inline`
(the picker sits open under the caption in the lifted detail view, where there's already room).

`app/(app)/chapters/[slug]/page.tsx` now also fetches the signed-in user's id
(`supabase.auth.getUser()`) and passes it down through `MemoryGrid` alongside a
`memoryId → Reaction[]` map, so `MemoryCard`/`MemoryDetail` know which reaction (if any) is
"mine" without each doing their own auth lookup.

## Mobile performance

Reported as "laggy on Android," chased across several turns:

1. **Animation freeze on touch devices.** The reduced-motion switch (`globals.css`, plus the JS
   guards in `useParallax` and `useAmbientLife`) now also fires on `(pointer: coarse)`, not just
   the OS accessibility setting. Rationale: the scene stacks several full-viewport
   `mix-blend-mode` layers inside one `isolation: isolate` root, which forces continuous
   re-flattening against anything animating underneath — cheap on desktop GPUs, visibly not on
   phones.
2. **That alone didn't fix it** — still heavy at rest, no animation running. Root cause: the
   ridge/cloud/leaf/meadow brushes in `PaintFilters.tsx` each run `feTurbulence` *twice* (edge
   warp + a second "tooth" pigment pass), and `feTurbulence` is the most expensive SVG filter
   primitive, over regions covering a large fraction of the viewport. Added `-lite` variants of
   those four filters (same warp/blur, tooth pass dropped) and swap them in via CSS
   `filter: url(#...) !important` under `(pointer: coarse)` — see the block near the bottom of
   `globals.css`. Desktop keeps full detail.
3. **Not independently verified from a real device yet.** A DevTools trace was captured but on a
   plain desktop viewport with no actual scroll during the recording, so it didn't exercise the
   `(pointer: coarse)` path at all — next session should redo it with device emulation
   (Cmd+Shift+M, pick a real phone) while actually scrolling, and compare Scripting vs.
   Rendering/Painting share.

## Scroll-bottom colour flash (Android)

Confirmed via screenshot + follow-up: happens specifically at the *bottom* of the page during a
fast scroll, not mid-page. That's rubber-band overscroll bouncing the viewport past the document's
actual bounds, past where `StorybookSky`'s `position: fixed; inset: 0` backdrop is anchored, for
an instant showing the plain `body` background colour underneath. Fixed with
`overscroll-behavior-y: none` on `html` and `body`. Not yet retested on-device (nothing in this
session has been deployed).

## Housekeeping

`app/(auth)/login/page.tsx`'s `DEV_LOGIN_PASSWORD` (dev-only autofill button, gated on
`NODE_ENV === "development"`) updated to `6/5/2026` to match a real password change — this only
affects what the local autofill button types in, not the actual Supabase account password.

## Next session should

- Apply `0003_reactions.sql` in Supabase before reactions can work at all.
- Get a real `(pointer: coarse)` DevTools trace (or an actual Android trace via
  `chrome://inspect`) to confirm the filter/animation work above actually fixed the lag, not just
  plausibly should have.
- Confirm the overscroll fix on-device once deployed.
