# 2026-08-08 — Waiting states across the app, and `/places` reduced to one control cluster

Same day as [`2026-08-08-places-cebu-leyte-hydration.md`](2026-08-08-places-cebu-leyte-hydration.md),
which this follows directly.

## Three React hydration bugs on `/places`

Not the same "hydration" as that other entry — these are server/client render mismatches.

1. **`LuckyDraw` drew its hand in a `useState` initializer.** That runs once on the server and
   again on the client, and `pickManyPlaces` is `Math.random()`-backed, so every load of `/places`
   rendered four different place names on each side and React tore the tree down. Fixed with a new
   `lib/react/useHydrated.ts` (`useSyncExternalStore`, no setState-in-effect): both renders show
   four card *backs*, the real hand appears the frame after.
2. **`SpinWheel`'s geometry differed in the last decimal.** `Math.sin`/`Math.cos` are
   implementation-defined in ECMAScript, so Node and the browser disagreed by one ULP
   (`y="114.40714482041952"` vs `114.40714482041953`) in `<text y>`, `transform` and `<path d>`.
   All the wheel's trig goes through one `pointAt`, so rounding there to 4 decimals fixes every
   case. `labelTransform`'s rotation was left alone deliberately — plain arithmetic is exactly
   specified by IEEE 754 and already agrees.
3. **Stale Turbopack cache**, not a code bug: the dev server's server bundle held the old
   55-place atlas while the client bundle had the new 91-place one, which produced both the
   `"has no atlas entry"` warnings and a wheel with fewer wedges on one side than the other.
   `rm -rf .next`.

## A body-scroll lock that could strand the page

`useBodyScrollLock` saved `document.body.style.overflow` per caller and restored its own saved
value on unmount. With a reveal card opening inside a discovery layer, two overlays hold the lock
at once, and Escape closes both: the layer's cleanup restores `""`, then the reveal's cleanup
restores its saved `"hidden"` — onto a page with no overlays left. The reader is left on an
ordinary page that will not scroll, with nothing on screen explaining why.

Now reference-counted at module scope: set on 0→1, cleared on 1→0, no ordering to get wrong.

**Still open:** Escape closes the reveal *and* the layer under it simultaneously, because both
register window `keydown` listeners and neither knows it isn't topmost. Harmless now that the
lock is counted, but "Escape returns you to the wheel" would be better than "Escape returns you
to the page".

## The no-spinner rule, made real

Full detail in the new [`codebase-map/waiting-states.md`](../codebase-map/waiting-states.md).
Short version:

- `components/ui/Waiting.tsx` — three ink drops settling, the `settling` keyframe in
  `globals.css`. No hooks and no `"use client"`, so it works in server components too. Replaces
  the one actual `animate-spin` in the codebase (`PlaceRevealOverlay`).
- `components/ui/PageWaiting.tsx` + eight new `loading.tsx` files. The app had **one**
  `loading.tsx` across thirteen routes.
- `components/nav/NavigationProgress.tsx` — `useLinkStatus` inside `NavLink`, covering the window
  between a tap and the navigation committing, which `loading.tsx` structurally cannot reach. A
  3px line easing across the top edge, indeterminate and never arriving, held at `scaleX(0)` for
  250ms so quick navigations draw nothing.

## The wheel's pointer was rotating with the wheel

`SpinWheel` drew its pointer inside the `<svg>` carrying `transform: rotate(...)`, so the marker
travelled with the wedges and never pointed at anything — which reads as *missing* rather than as
misplaced, and is how it was reported.

It has now been in the wrong place twice: first as a sibling HTML div pinned to the wrapper's top
edge (correct rotation, wrong scaling — it drifted at every width but one), then inside the
viewBox (correct scaling, rotating). The fix is a second, non-rotating `<svg>` stacked over the
first and sharing its viewBox, which is the only arrangement that holds both properties at once.
`computeSpinRotation` has always assumed a pointer fixed at twelve o'clock; now there is one.

## Waits are scenes, not just marks

`Waiting` alone was correct and still read as a utility, and a bare mark on a wash looked like a
process bar. `components/ui/WaitingScene.tsx` adds a bloom of warm light with ten motes rising
through it, reusing `Meadow`'s own `mote-rise` keyframe so a wait drifts at the same speed as the
world outside the window. Used by every route-level `loading.tsx`.

The mote table is a literal, deliberately — this renders inside components that server-render, and
`Math.random()` positions would reintroduce the same hydration-mismatch class fixed further up
this entry.

`Waiting` also gained an **`onScene`** prop, off by default. It applies `.ink-legible`, without
which a `text-ink-muted` label on the night meadow is dark type on a dark garden — "Reading the
compass…" was very nearly invisible with the night toggle on. It must stay opt-in, because that
class's `text-shadow` inherits and reads as blur on a `bg-surface` card; `PlaceRevealOverlay` is
the one caller that correctly omits it.

### The nav indicator was rebuilt, not tuned

The full-screen veil went through 180ms → 450ms delays and still wasn't right, and the problem
turned out not to be the timing. Its `backdrop-blur` over a translucent background left a smeared
ghost of the page you were leaving — which reads as a rendering fault, not atmosphere — and a
whole-screen takeover is disproportionate for something that usually resolves in under a second.

Replaced by `NavigationProgress`: a 3px warm line at the top edge, page untouched underneath.
**Don't rebuild the veil.** The scene component it used is still right for `loading.tsx`, where
the old page really is gone.

## `/places` is now hero-plus-one-gift

The page stacked five discovery modes vertically, mounting every one on arrival, with "spin the
wheel" as a scroll target three games down. Now:

- Four modes open in a `DiscoveryLayer` (a layer, not a route — see that file for why), so
  nothing mounts until asked for.
- All controls moved **into `PlacesHero`**, over the backdrop: Surprise Me filled and alone, a
  hairline divider, four glass pills, then the browse link. Three tiers of emphasis on one
  screen, replacing the vertical distance that used to signal the same thing.
- Below the hero: today's pick, then the reflection. Nothing else, because everything below the
  hero should be what the book *gives* you, not another menu.

They went through one intermediate shape — full-width cards with a heading and paragraph each —
which was rejected on sight for eating a screen and reading as four things to study. The
invitation lines survive as each layer's own title.

`DiscoveryDoors` takes the hidden-gem rail as a **`ReactNode`, not `PlaceSummary[]`**: passing the
data would have pulled the server-only `PlaceRail`/`PlaceCard` into the client bundle and
serialised 85 KB of summaries (mostly inlined `blurDataUrl`s) across the RSC boundary on every
visit, opened or not.
