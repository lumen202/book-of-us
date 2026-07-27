/**
 * Deterministic pseudo-randomness for the painted backdrop.
 *
 * Two reasons this is seeded rather than `Math.random()`:
 *
 * 1. **Hydration.** The scenery is generated during render and shipped as
 *    markup from the server. An unseeded generator would produce different
 *    geometry on the server than on the client and React would scream.
 * 2. **The scene is a place, not a slot machine.** The meadow should be the
 *    same meadow every visit — you should be able to recognise the rock you
 *    saw last week. Randomness here buys *irregularity*, not novelty.
 *
 * `mulberry32` is used because it is four lines, has no state to reset between
 * renders, and produces perfectly good visual noise.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = {
  /** Uniform in [min, max). Defaults to [0, 1). */
  float(min?: number, max?: number): number;
  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number;
  /** One item, uniformly. */
  pick<T>(items: readonly T[]): T;
  /** True with probability `p`. */
  chance(p: number): boolean;
  /** `value` ± `spread`. The workhorse — most calls here are "roughly this". */
  around(value: number, spread: number): number;
  /**
   * Uniform in [min, max) but biased toward the middle (average of two draws).
   * Use where extremes read as mistakes rather than as variation — leaf sizes,
   * hill bump heights.
   */
  mid(min: number, max: number): number;
};

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    float: (min = 0, max = 1) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    around: (value, spread) => value + (next() * 2 - 1) * spread,
    mid: (min, max) => min + ((next() + next()) / 2) * (max - min),
  };
}
