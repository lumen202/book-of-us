/**
 * How far a layer travels when the reader scrolls.
 *
 * Paired with `useParallax`, which publishes `--scroll` (0 → 1) on the scene
 * container. A layer declares its own travel in pixels and the browser does the
 * rest on the compositor.
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

/** A `transform` that follows the camera. Safe on any layer inside the scene. */
export function parallax(px: number): string {
  return `translate3d(0, calc(var(--scroll, 0) * ${px}px), 0)`;
}
