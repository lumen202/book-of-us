# Coffee easter eggs: mug on the bench, flying coffee cup creature

Prompted by: she's a big coffee lover and the garden had no trace of it.

## What shipped

1. **A coffee mug prop, resting on the bench.** `lib/ambient/props.ts` — `bench()` now also
   returns `surface: Point` (a resting spot toward one end of the seat, not the centre, since the
   centre is for sitting). New `mug()` generates a small cup + rim + handle + coffee fill + two or
   three curling steam paths from that point. Rendered in `NearHills()`
   (`components/ambient/paint/HillRange.tsx`), same `brush-prop` filter group as the bench itself,
   right after it. Same storytelling mechanism the doc for this subsystem already names — an
   object that implies a person without ever drawing one — so it slots in next to the swing and
   the lanterns rather than needing a new rule.
2. **A new `steam-curl` keyframe** in `app/globals.css`, next to `mote-rise`. Deliberately tiny
   (14px rise, not `mote-rise`'s 86vh) and `infinite` rather than one-shot, because steam off a hot
   cup doesn't stop. Classed `ambient-steam`, so it's already covered by the one
   `[class*="ambient-"]` reduced-motion kill rule — no new media-query work needed.
3. **A flying coffee cup as a new `LifeKind`.** First tried a coffee-mug-shaped cloud (see
   "Rejected" below); the user redirected to a creature instead — "this is a fantasy garden
   anyway." Added `"coffee"` to `LifeKind` in `lib/ambient/useAmbientLife.ts`: `wander` motion like
   a butterfly but slower and higher (`top: 40–70`, `duration: 26–44s`). `FlyingCoffee` in
   `components/ambient/paint/LivingThings.tsx` reuses the butterfly's wing rig (`ambient-wing` +
   `wing-beat`) on a small mug body, with a `steam-curl` trail. No device-specific gating needed —
   the file's own note on `MAX_CONCURRENT` already explains why creature life is exempt from the
   `(pointer: coarse)` throttling (nothing here carries `mix-blend-mode`).

   Initially shipped at ladybug-level rarity (`CADENCE: [48, 96]`) as a "private joke" — the user
   then explicitly said they didn't want it as just an easter egg, they wanted it numerous. Revised
   to butterfly-level frequency: `CADENCE: [6, 14]`, added to `BURST` (`[1, 2]`, same as
   petals/leaves/butterflies) so pairs can drift past together, moved its first appearance up to
   ~2–4s (alongside butterfly/bee) instead of ~22–42s, and raised `MAX_CONCURRENT` from 26 to 34 to
   give the steady-state headroom this added (several more long-lived 26–44s creatures now
   overlapping). If a future session is asked to tune the *feel* of this again, `CADENCE`/`BURST`
   in `useAmbientLife.ts` are the two knobs — don't reach for `MAX_CONCURRENT` first, it's a safety
   cap, not a density control.

## Rejected: mug-shaped cloud

Initially built `mugCloudMass()` in `lib/ambient/clouds.ts` and wired a `shape: "mug"` branch into
`CloudBank.tsx` — a cloud whose lobes were arranged to loosely suggest a mug + handle, kept small,
far and pale per the "you'd only notice if you were looking" register. Fully implemented and
typechecked, then reverted (`git checkout --`) when the user asked for a flying-creature approach
instead. `painted-world.md`'s existing invariant (clouds are naturalistic cumulus, "would you want
to spend an afternoon here" is the test) made this the riskier of the two options anyway — worth
remembering if a future session is tempted to revisit it.

## Verification

`npx tsc --noEmit` clean. Could not visually verify in-browser: the app is behind Supabase auth and
no dev credentials were available in this session. Dev server was started and compiled without
runtime errors, but nobody looked at the meadow with these changes in it — a future session with
credentials should actually load `/` and look at the bench and sky for a while.

## Also this session: night-mode icon toggle in the header

Unrelated to coffee, same session. The user found navigating to Settings for the night-preview
toggle (`components/settings/NightModeToggle.tsx`) bothersome and asked for a header shortcut,
while explicitly keeping the Settings row.

New `components/nav/NightModeIconToggle.tsx` — a small icon button (hand-drawn sun/moon SVGs, no
icon library in this repo) that reads/writes the same `useNightPreview()` context as the Settings
toggle, so both stay in sync automatically. Wired into `AppHeader.tsx`, visible at every
breakpoint (wrapped the existing `hidden sm:flex` nav + `MobileNavMenu` in a new flex row so the
icon sits beside both variants rather than needing to be duplicated inside each one). It hides
during the opening ceremony via the same `useOpeningActive()` guard `MobileNavMenu` already uses,
since it occupies the same top-right corner as the ceremony's "Skip intro" button.

Did not touch `NightModeToggle.tsx` or the Settings page — left redundant on purpose, per the
request.

## Also this session: steam/mug visibility chase, then the bench mug was cut

Several rounds of follow-up on the coffee additions above, ending with the bench mug removed
entirely — kept here because the colour reasoning is still live for the flying cup and worth not
re-deriving next time.

1. First pass: both the steam (bench mug and flying cup) and the flying cup's wings were coloured
   with pigments built from the same tokens the sky itself swings on between day and night —
   `pigment.light` (`mix(T.butter, 66, T.surface)`) for steam, `pigment.cloudBody`
   (`mix(T.paper, 92, T.sky)`) for the wings. Both nearly disappeared against the day sky. Switched
   to `pigment.shadow` (`mix(T.leafDeep, 58, T.lilac)`), the pigment `Bird`/`Drifting` already rely
   on for the same job elsewhere in `LivingThings.tsx`.
2. Second pass: `shadow` fixed the flying cup against open sky but made the *bench* mug's steam
   disappear at night — the bench mug sits low, over grass and the hillside's own cool-band shading
   in `Ridge`, which is painted in `pigment.shadow` itself. A shadow-coloured wisp drawn over
   shadow-coloured ground blends in, worst once the night grass tone darkens toward the same value.
   Sky contrast and ground contrast are different problems and one pigment doesn't solve both.
3. Third pass: switched to a halo technique instead of hunting for a single do-everything colour —
   same idea `.ink-legible` already uses for hero text over this same variable backdrop. Each steam
   wisp became two stacked paths sharing one `d`: a wide, low-alpha `pigment.bark` halo underneath
   (dark, UI-stable, never washes out) and a thin `pigment.lantern` core on top (stays a bright warm
   cream/gold at every hour — see its note in `palette.ts`, "a warm point of light in a blue
   field"). One of the two always contrasts with whatever is behind it. The mug/cup body itself
   moved from `pigment.wood` to `pigment.lantern` too, for the same reason: it was the same colour
   as the wood-toned bench/handle right under it, so at any hour the two dark shapes merged into
   one. `wood` stayed only on the handle, as a dark line of definition against the now-pale body.
4. **The user then clarified the mug-colour complaint was about the flying cup specifically, and
   separately asked to remove the bench mug outright.** Reverted: `mug()` deleted from
   `lib/ambient/props.ts`, `bench()`'s `surface: Point` return (only ever used to place the mug)
   removed, and the bench-mug render block cut from `HillRange.tsx`. The flying `FlyingCoffee` in
   `LivingThings.tsx` keeps the lantern-body/bark-halo-steam treatment from step 3 — that's the only
   coffee mug left in the scene now, alongside the bench prop from step 1 of the original entry
   above (also removed, see this same bullet).

**Net state**: no coffee mug prop on the bench anymore. The only coffee-mug visual is the flying
`coffee` creature in `LivingThings.tsx`, using `pigment.lantern` (body) / `pigment.wood` (handle) /
the `bark`-halo-behind-`lantern`-core steam technique, and `pigment.shadow` for the wings.

**If a future session adds another mark that must read against a *changing* backdrop (sky, grass,
day, night)**, don't reach for a single pigment and hope — check what's actually behind the mark
first (open sky vs. ground use different pigments even within this one palette) and default to the
halo technique in step 3 if the backdrop can't be pinned down. Reserve `cloudBody`/`cloudShade`/
`cloudLit` for actual cloud geometry only; they're built to dissolve into the sky on purpose.

## Also this session: vault reaction flicker on change

Unrelated bug, same session: changing a reaction in the vault (`VaultReactions.tsx`) flickered back
to the old emoji before landing on the new one. Root cause: `reactToVaultItem`/`unreactToVaultItem`
in `app/(app)/vault/actions.ts` never called `revalidatePath`, and the vault's `reactions` prop
traces back to `VaultGrid`'s `items` state, seeded once from the one-shot `unlockVault` action and
never refreshed — unlike the main book's chapter pages, there's no server component in this tree to
revalidate into. `useOptimistic`'s optimistic value reconciles against that same stale `reactions`
prop the moment its transition settles, so it reverted to the pre-click emoji every time; the
"eventually correct" appearance most users reported was actually a *later* unrelated re-render
(reopening the picker, etc.) papering over it, not the fix taking effect.

Fix: `VaultReactions` now takes an optional `onReacted(emoji: string | null)` callback, fired after
the server action resolves (`VaultReactions.tsx`). `VaultCard` forwards it as
`onReactionChange`, and `VaultGrid.updateReaction()` writes the confirmed emoji back into its
`items` state — mirroring how upload/remove already mutate that same state. This makes the
`reactions` prop agree with the optimistic value by the time the transition settles, so there's
nothing to flicker back to. Did not add `revalidatePath` — it would be dead code here, since
nothing downstream of the vault's client tree ever re-fetches from a server render.

## What the next session should watch out for

- If someone adds more "personal joke" creatures later, follow the `coffee` cadence pattern
  (rarer than the real-garden creatures) rather than mixing them in at butterfly frequency — the
  point of these is that they're a surprise, not a fixture.
- The mug's `surface` point is only exposed by `bench()`; if the bench ever moves or is
  regenerated with a different seed, the mug moves with it for free (it's derived, not
  hard-coded), but its own `seed: 615` is independent — changing it reshuffles the cup and steam
  without touching the bench.
