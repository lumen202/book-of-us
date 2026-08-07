import { CATEGORY_LABELS, CATEGORY_ORDER } from "./taxonomy";
import type { Place, PlaceCategory } from "./types";

export type WheelSegment = {
  category: PlaceCategory;
  label: string;
  /** Degrees, 0 = up (12 o'clock), clockwise. */
  startDeg: number;
  endDeg: number;
  midDeg: number;
};

/**
 * Equal-sized wedges, one per category that actually has at least one place
 * — built from `CATEGORY_ORDER` (`lib/places/taxonomy.ts`) rather than
 * hardcoded here, so the wheel redraws itself if the atlas ever drops a
 * category to zero places instead of landing on an empty wedge. Deliberately
 * equal-sized rather than sized by how many destinations back each one: a
 * physical wheel's wedges don't resize themselves, and a "Museums" wedge that
 * looks a fifth the size of "Islands" would read as the game being rigged
 * before it's even spun.
 */
export function buildWheelSegments(places: readonly Place[]): WheelSegment[] {
  const active = CATEGORY_ORDER.filter((category) =>
    places.some((place) => place.category.includes(category)),
  );
  const step = 360 / active.length;
  return active.map((category, index) => {
    const startDeg = index * step;
    const endDeg = startDeg + step;
    return { category, label: CATEGORY_LABELS[category], startDeg, endDeg, midDeg: startDeg + step / 2 };
  });
}

/** Uniform pick among the wheel's own wedges — the physical-wheel fairness the segments themselves promise. */
export function spinToCategory(
  segments: readonly WheelSegment[],
  rng: () => number = Math.random,
): WheelSegment {
  const index = Math.floor(rng() * segments.length);
  return segments[Math.min(index, segments.length - 1)];
}

/**
 * How far (in degrees, clockwise, additive) the wheel should rotate so a
 * fixed pointer at 12 o'clock ends up over `segment`'s middle — several full
 * turns first so it reads as a genuine spin rather than snapping straight to
 * the answer, then a small random jitter within the wedge so identical
 * categories don't always stop at the exact same visual angle.
 *
 * `currentRotation` is the wheel's rotation *before* this spin (accumulate
 * across spins rather than reset to 0, so a second spin doesn't visually
 * snap backward) — pass the caller's last known rotation, 0 for the first spin.
 */
export function computeSpinRotation(
  segment: WheelSegment,
  currentRotation: number,
  rng: () => number = Math.random,
): number {
  const extraTurns = 4 + Math.floor(rng() * 3); // 4–6 full turns
  const jitter = (rng() - 0.5) * (segment.endDeg - segment.startDeg) * 0.6;
  const targetWithinTurn = 360 - segment.midDeg + jitter; // clockwise wheel, pointer fixed at top
  const currentWithinTurn = ((currentRotation % 360) + 360) % 360;
  const delta = ((targetWithinTurn - currentWithinTurn) % 360 + 360) % 360;
  return currentRotation + extraTurns * 360 + delta;
}
