# Backdrop performance, properly diagnosed: blend-mode area and parallax invalidation

Follow-on to `2026-07-27-emoji-reactions-and-mobile-perf.md`, which chased Android lag and landed
on two partial fixes (freeze the blended animations, add `-lite` brushes) without ever confirming
either from a device. The brief this session was the opposite of "make it stop moving": keep the
butterflies, the wind, the whole feel, and make it cheap enough to run on an Android phone.

Two root causes, neither of which was the thing previous sessions were optimising.

## 1. Blend-mode *area*, not filter cost

`mix-blend-mode` is not compositable in isolation. The compositor has to resolve the layer's
entire backdrop into a texture, read it back, blend, and then do it again for the next blended
layer up — and it must redo that over the blended element's **whole area** whenever anything in
its backdrop moves.

The scene stacked **six viewport-sized blend layers** inside one `isolation: isolate` root: the
sky wash (soft-light), `SunGlow` (screen, on an `inset-0` wrapper), `LightRays` (screen, also on
an `inset-0` wrapper), and three passes of `GrainOverlay`. So a single butterfly crossing the
frame re-resolved six full screens of blending, every frame, at ~3× DPR.

That is the entire story of "laggy on Android". It also explains why the previous session's
freeze-everything experiment was the only thing that appeared to help, and why the `-lite`
filters barely moved the needle — filters rasterise once; they were never the per-frame cost.

Fixed by shrinking the blended regions rather than stopping the motion:

- **Unconditional, all devices:** `screen` moved off the `inset-0` wrappers of `LightRays` and
  `SunGlow` onto the individual rays and falloffs. Six narrow strips and a corner instead of two
  viewports. `screen` is associative and the opacities are low, so nothing visible changed.
- **`(pointer: coarse)` only:** paper grain 3 passes → 1 (fine multiply grain dropped — a 300px
  noise tile at 9% opacity is sub-device-pixel on a phone and averages to a flat darkening; bloom
  unblended, which over warm light sky lands within a few percent of `screen`; the coarse mottle
  stays, because it is the pass actually stopping the sky reading as a fill). Meadow sparkles
  unblended too — `screen` sitting directly over the swaying grass was being re-resolved every
  frame whether or not the sparkles themselves animated.
- **`(pointer: coarse)` only:** `ambient-sky-warm` joins the frozen set. A 210s opacity ramp on a
  viewport-sized div under the whole blend stack: imperceptible, and on its own enough to keep a
  full-screen blend re-resolving at 60fps for as long as the page is open.

## 2. Parallax was invalidating the entire scene subtree

Found from a user observation: *"when I'm in the top part it feels more laggy than at the
bottom."* `--scroll` clamps after 1100px, so past that it stops changing — the symptom pointed
straight at the parallax update path.

`--scroll` was one custom property published on the scene root, with each layer declaring
`translate3d(0, calc(var(--scroll) * -48px), 0)`. One property write per frame reads as the
cheaper design and is the opposite of it: **custom properties inherit**, so changing it
invalidates style for every descendant of the scene — around a thousand SVG nodes, the whole
meadow included — which the browser walks on the main thread before it can paint. And `calc()`
over a custom property can't go to the compositor either, so none of it was composited.

Replaced with: nine layers carry `data-parallax="<px>"`, `useParallax` collects them once on
mount and writes `style.transform` directly. Nine writes, zero descendant invalidation, all on
elements already promoted by their resting `translate3d(0,0,0)`. `parallax()` in `depth.ts` now
returns spreadable props instead of a CSS string; the three call sites with their own `style`
object set `data-parallax` and the resting transform by hand.

## Also

`-lite` filter warps dropped to `numOctaves={2}`. Turbulence cost is ~linear in octaves and, at
these base frequencies, octaves 3–4 produce detail finer than the displacement scale can express.

Meadow thinning on touch: far row stops swaying (`meadow-far`) and every third far tuft is hidden
(`meadow-thin`) — ~106 animated groups down to ~55, with the near rows, which carry the wind wave
and lean 3× as far, completely untouched. Blurred pollen motes (`mote-soft`) hidden on touch;
each was its own composited layer with a blur pass.

## Not verified on-device

Same caveat as last session, and it now applies to a much larger change: none of this has been
measured on real Android hardware. The reasoning is sound and the user's top-vs-bottom
observation independently corroborates cause #2, but **the next session should get an actual
trace** (`chrome://inspect` to a real phone, or DevTools device emulation while scrolling) before
anyone treats this as settled. Look specifically at the compositing/blending share, which is what
both fixes target.

Also still outstanding from the previous entry: `0003_reactions.sql` and `0004_comments.sql` are
not applied in Supabase, and the `overscroll-behavior-y` fix is not confirmed on-device.
