# The Painted World (ambient backdrop)

`components/ambient/StorybookSky.tsx`, mounted once in `app/(app)/layout.tsx` at `-z-10`. The
whole book takes place inside it.

It is a warm afternoon in a flower meadow: a swing hanging from a big tree, a creek with a little
bridge, a lantern-strung fence, a bench facing the light, a flower-lined path leaving the bottom
of the frame, and blossoming boughs reaching in from both top corners.

Nothing is an image asset. Every shape is generated at render time from seeded noise and every
colour is a `color-mix()` of design tokens.

## Read this before changing it

**It is a place, not scenery.** The test for any change is: *would you want to spend an afternoon
here with someone you love?* Three properties are load-bearing and easy to destroy by accident:

1. **Intimacy over scale.** The hills are low and close on purpose. An earlier version had eight
   ridges and a mountain range receding for miles; it was a better *landscape* and completely the
   wrong feeling, because scale puts the viewer outside the frame and what comes back is awe or
   loneliness. Do not add distance.
2. **No grey, no olive, no desaturated brown, no dark vignette.** All four read as melancholy.
   The palette is built to make them unreachable — see below.
3. **The couple is present only through objects.** There are no people and there never will be.
   The swing, the bench, the worn path, the unlit lanterns are all things that imply *use*. That
   is the entire emotional mechanism.

Plus the composition rules: foliage in all four corners and calm in the middle (the text lives
there); nothing crosses the reading band quickly; nothing loops visibly; the resting state under
`prefers-reduced-motion` must look finished.

## Why it doesn't look like SVG

`components/ambient/paint/PaintFilters.tsx` — read this file first. Clean geometry is generated,
then every mass is pushed through a filter that warps its outline along a `feTurbulence` noise
field (`feDisplacementMap`), multiplies a much finer noise back over the fill for uneven pigment,
and adds a little blur for distance. A mathematically perfect bezier comes out wobbling like a
loaded brush. This one technique is why nothing needed to be hand-drawn.

`GrainOverlay.tsx` then pulls one shared paper texture over everything, which is what makes it
read as one painting rather than as assembled parts.

## Layout of the code

| Concern | File |
|---|---|
| Orchestrator, layer order, composition rules | `components/ambient/StorybookSky.tsx` |
| The brushes (SVG filter bank) | `components/ambient/paint/PaintFilters.tsx` |
| Sky, sun | `paint/Sky.tsx` |
| Clouds | `paint/CloudBank.tsx` |
| Hills, creek, bridge, fence, lanterns, bench, path | `paint/HillRange.tsx` |
| Sun shafts | `paint/LightRays.tsx` |
| The tree with the swing | `paint/BigTree.tsx` |
| Meadow, flowers, pollen | `paint/Meadow.tsx` |
| Framing boughs | `paint/FramingBoughs.tsx` |
| Creatures | `paint/LivingThings.tsx` |
| Paper texture and bloom | `paint/GrainOverlay.tsx` |

Generation lives in `lib/ambient/` (invariant: no logic outside `lib/`):

| Concern | File |
|---|---|
| Seeded PRNG | `rng.ts` |
| Value noise + fbm | `noise.ts` |
| Catmull-Rom, blobs, sampling | `path.ts` |
| Pigments, species colours, aerial perspective | `palette.ts` |
| Ridgelines, treelines, scrub, hill flowers | `terrain.ts` |
| Swing, bench, bridge, creek, path, fence, lanterns, stones | `props.ts` |
| Canopies, the big tree, grass, flowers, pollen | `flora.ts` |
| Cloud masses | `clouds.ts` |
| Parallax depths + `--scroll` hook | `depth.ts`, `useParallax.ts` |
| Creature scheduling | `useAmbientLife.ts` |

Keyframes are all in `app/globals.css` — they are shared across many elements at different
durations, and every one of them has to be killable by the single `prefers-reduced-motion` rule
at the bottom of that file.

## Everything is seeded

`makeRng(seed)` everywhere, never `Math.random()`, for two reasons: the geometry is rendered on
the server and must match on the client, and the garden should be *the same garden* every visit —
you should be able to recognise the rock you saw last week. Randomness buys irregularity, not
novelty.

The one exception is `useAmbientLife`, which is client-only, starts after mount, and *is*
genuinely random — unpredictability is the whole feature there.

## The garden palette

The base tokens are cream, warm brown, meadow teal and apricot, and **no mix of them reaches
green, pink, lavender or butter yellow** (teal toward apricot is near-complementary and lands on
khaki). So `gardenTokens` in `lib/theme/tokens.ts` adds six scene pigments: `leaf`, `leafDeep`,
`blossom`, `lilac`, `butter`, `sky`.

- **These are for the backdrop only.** UI stays on `baseTokens`. That separation is what stops
  the world leaking into the interface.
- `lib/ambient/palette.ts` mixes every scene colour from those plus the base tokens. No literal
  hex is allowed in the scene.
- Shade is a green-lavender at low alpha, never black or grey. Distance dissolves into the sky's
  own colour, never into haze. Sunlight is butter, not orange.
- Seasons move `--color-leaf` / `--color-leaf-deep` (how green the year is) and the base accents.
  Blossom, lilac, butter and sky deliberately do not move — the flowers are what make it this
  place.

## Motion

Only `transform` and `opacity` are ever animated. Filters are static and rasterised once —
animating a filter primitive would re-run the whole paint every frame and is the single change
most likely to make this expensive.

Scroll parallax is one custom property (`--scroll`, 0→1, clamped) published by `useParallax`;
each layer declares its own travel in `depth.ts`. Travel is tens of pixels, and the *ratios*
between layers are the effect. Parallax you can see is parallax that has become the subject.

`useAmbientLife` runs an independent random-interval timer per creature kind, so the aggregate
never resolves into a rhythm. Butterflies, bees and fireflies use `life-wander` (five eased
waypoints) rather than a straight glide — a butterfly that flies in a straight line is a
moth-shaped bullet.

## Performance budget

The meadow is one SVG whose children animate, so it repaints as a whole each frame; its node
count is the real budget. Currently ~590 nodes / ~106 animated groups. If you add to it, take
something out — and spend detail by distance (far flowers are two nodes, near ones are seven).

Narrow viewports show a horizontally *cropped slice* of the meadow rather than the squashed full
width — see the comment in `Meadow.tsx`.

## Reduced motion

The single `[class*="ambient-"]` rule in `globals.css` kills every animation, which is why every
animated element carries an `ambient-` class. Three things cover the rest: `useParallax` never
attaches (so `--scroll` stays 0), `useAmbientLife` starts no timers, and `DistantFlock` renders
two static flocks and two resting butterflies so the garden still looks inhabited when nothing
moves.

## Shared with the opening sequence

`lib/opening-sequence/art/MonthsaryGarland.tsx` reuses the `cloud-drift`, `bird-fly` and
`bird-flap` keyframes. Don't delete those.
