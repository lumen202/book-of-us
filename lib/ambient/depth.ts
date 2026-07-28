/**
 * How far a layer travels when the reader scrolls.
 *
 * Paired with `useParallax`, which finds every element carrying `data-parallax`
 * inside the scene and writes its transform directly.
 *
 * The numbers below are a depth ordering, and the *ratios* between them are the
 * whole effect — the sky barely stirs, the grass at your feet moves seven times
 * as much, and the mind reads the difference as distance without ever noticing
 * the movement. The absolute values are deliberately tiny. Parallax you can see
 * is parallax that has become the subject.
 *
 * Near layers travel furthest, so they are also drawn taller than the viewport
 * (see the `-bottom` offsets in the meadow and hills) — otherwise sliding them
 * up would expose the page underneath.
 */
export const TRAVEL = {
  sky: -5,
  cloudsFar: -9,
  cloudsNear: -15,
  rangeFar: -18,
  hillsNear: -30,
  tree: -36,
  props: -30,
  meadow: -48,
  boughs: -40,
  motes: -42,
} as const;

/**
 * Marks an element as a parallax layer and gives it its resting transform.
 * Spread onto the layer's wrapper: `<div {...parallax(TRAVEL.meadow)} />`.
 *
 * The `translate3d(0,0,0)` is not decoration — it is what puts the layer on the
 * compositor *before* the first scroll, so the hook's first write promotes
 * nothing and the transform it sets is a composited property from the start. It
 * is also the correct resting position, which is what a reduced-motion visit
 * (where the hook never attaches) and the server render both need.
 *
 * ## Why the travel is an attribute and not a CSS variable
 *
 * This used to be one custom property, `--scroll`, published on the scene root,
 * with each layer declaring `translate3d(0, calc(var(--scroll) * -48px), 0)`.
 * One property write per frame instead of nine, which reads as the cheaper
 * design and is the opposite of it: custom properties inherit, so changing
 * `--scroll` on the root invalidates style for **every descendant of the
 * scene** — around a thousand SVG nodes, the whole meadow included — and the
 * browser walks all of them on the main thread before it can paint. And a
 * `calc()` over a custom property cannot be handed to the compositor at all, so
 * none of it was composited either.
 *
 * Nine direct `style.transform` writes touch nine elements and invalidate no
 * descendants, because a transform on an element does not affect how its
 * children's styles resolve. The symptom that found this: the page was
 * noticeably heavier near the top and smooth further down — `--scroll` clamps
 * after 1100px, so past that it stops changing and the invalidation stopped
 * with it.
 */
export function parallax(px: number) {
  return {
    "data-parallax": px,
    style: { transform: "translate3d(0, 0, 0)" },
  } as const;
}
