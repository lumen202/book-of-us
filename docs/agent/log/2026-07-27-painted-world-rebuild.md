# 2026-07-27 — Backdrop rebuilt as a generated painted world, then re-aimed at the love story

## Why

Two requests in one session, and the second one reversed part of the first — worth recording in
that order, because the second half is the more important lesson.

**First:** the backdrop (`StorybookSky`) was flat vector art — three smooth bezier hills, clouds
made of four ellipses, a gradient sky. The ask was for a hand-painted cinematic environment with
real texture, atmosphere and depth, explicitly *not* another minimalist SVG landscape.

**Second, after seeing the result:** it was technically successful and emotionally wrong. It read
as quiet, lonely and nostalgic — an empty countryside. This site is about two people in love. The
ask became: keep the craft, throw out the world, and build a cozy place a couple would spend an
afternoon in.

## Shipped

### The painting engine (kept through both passes)

- `components/ambient/paint/PaintFilters.tsx` — an SVG filter bank. Every mass in the scene is
  warped by `feTurbulence` → `feDisplacementMap`, has a finer noise multiplied back over its fill
  for uneven pigment, and carries depth-scaled blur. This is the whole answer to "don't make it
  look like SVG"; nothing had to be hand-drawn.
- `lib/ambient/` — all geometry generated from a seeded PRNG (`rng.ts`), value noise + fbm
  (`noise.ts`), Catmull-Rom splines and irregular blobs (`path.ts`). Seeded so the server and
  client agree *and* so it is the same garden every visit.
- `GrainOverlay.tsx` — one shared paper texture (two tiled turbulence fields at unrelated sizes)
  pulled over everything, which is what makes it read as one painting rather than assembled parts.
- `useParallax.ts` + `depth.ts` — one `--scroll` custom property; each layer declares its own
  travel in px. Clamped, small.
- `useAmbientLife.ts` — independent random-interval timer per creature kind, so nothing loops.

### The world (rebuilt in the second pass)

- Hills cut from eight ridges + a mountain range to **five low, close rises**. Aerial perspective
  ramp shortened so the far side never washes out.
- New props implying two people: **swing** on a big tree, **bench facing the light**, **creek +
  little bridge**, **flower-lined path**, **stepping stones**, **fence with unlit lanterns**.
- New `paint/BigTree.tsx` — the tree the swing hangs from, drawn as its own aspect-correct layer
  (the hill SVG is `preserveAspectRatio="none"` and would squash it).
- Meadow rebuilt around flowers: **six species** with their own silhouettes (daisy, buttercup,
  pink wildflower, lavender spike, clover, tiny white blossom), growing in **drifts** rather than
  scattered evenly. Detail spent by distance — far flowers are 2 nodes, near ones 7.
- `edgeBias` — grass and flowers grow taller toward the left and right edges, so the foreground
  arches around the content. With boughs in both top corners, the page has foliage in all four
  corners and calm in the middle.
- Blossom added to both framing boughs and the big tree.
- Creatures: added **bees, ladybugs, fireflies**; butterflies/bees/fireflies now use
  `life-wander` (five eased waypoints) instead of gliding in straight lines.
- Sparkle highlights on the grass; `swing-rest` keeps the swing drifting a degree, as if someone
  just got up.

### Palette

- Added `gardenTokens` to `lib/theme/tokens.ts` (+ `:root` and season blocks in `globals.css`):
  `leaf`, `leafDeep`, `blossom`, `lilac`, `butter`, `sky`. **Scene-only — not for UI.**
- Rewrote `lib/ambient/palette.ts` around them. Nothing mixes into `ink` any more except bark.
- Removed the dark vignette in favour of a warm screened bloom.

## The thing worth remembering

**The first version failed on colour theory that was locally correct and globally wrong.** Its
greens were reached by mixing the teal accent into the warm brown ink — textbook desaturation,
and exactly how you paint a wistful autumn hillside. Every individual decision was defensible and
the sum was melancholy.

The fix was not to adjust the mixes. It was to notice that **the base token set cannot express
this emotion at all**: cream + brown + teal + apricot has no route to green, pink, lavender or
butter yellow, because teal and apricot are near-complementary and land on khaki. A widened,
clearly-scoped token set was the honest fix.

**Scale is not emotionally neutral either.** Eight ridges of aerial perspective is a better
landscape and a worse *place* — distance puts the viewer outside the frame. Intimacy came from
making the world smaller, not prettier.

## Verified

- `npx tsc --noEmit`, `npx eslint .`, `npx next build` all clean.
- Geometry sanity check (scratchpad script, not committed): 3211 generated values, all finite; no
  `NaN` in any path string; `meadow()` and `paintedTree()` byte-identical across calls, so
  hydration is safe. Meadow measured at ~591 SVG nodes / 106 animated groups.

## Not verified

- **Nobody has looked at it.** No screenshot was taken this session — every route except `/login`
  is auth-gated, so rendering it needs a logged-in browser. The build and the geometry check pass,
  but composition, colour balance and whether the emotional read actually lands are unconfirmed.
  This is the first thing the next session should do.

## Notes for next session

- Legacy keyframes `sway`, `float-up` and `sun-glow` were removed; `cloud-drift`, `bird-fly` and
  `bird-flap` were kept because `lib/opening-sequence/art/MonthsaryGarland.tsx` uses them.
- The opening sequence (`MonthsaryGarland`) still carries the *old* flat cloud/bird art and now
  sits stylistically apart from the backdrop. Worth a pass to bring it into the same hand.
- Performance budget lives in `painted-world.md`. If the meadow grows, take something out.
- Per-chapter atmosphere (`chapters.atmosphere` jsonb) is still unbuilt and would layer naturally
  on `gardenTokens`.
