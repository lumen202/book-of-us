/**
 * Turning point lists into curves.
 *
 * Everything organic in this backdrop is generated as a scatter of points and
 * then run through `catmullRomPath`. Catmull-Rom is used rather than authoring
 * beziers by hand because it *passes through* every point it is given: we can
 * place a ridge or a leaf outline by describing where it should be and get a
 * smooth curve for free, instead of reverse-engineering control handles.
 *
 * Nothing here is allowed to produce a perfect circle or a perfect wave — the
 * inputs are always jittered by the caller's `Rng` first.
 */
import type { Rng } from "./rng";

export type Point = { x: number; y: number };

/** Two decimals is well under a device pixel at these scales and roughly halves
 *  the size of the generated markup. */
function f(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Catmull-Rom spline through `points`, emitted as cubic beziers.
 *
 * The `/6` is the standard uniform Catmull-Rom → bezier conversion: the
 * control handle for a segment points along the vector between that point's
 * two neighbours.
 */
export function catmullRomPath(points: Point[], closed = false): string {
  if (points.length < 2) return "";

  const at = (i: number): Point => {
    if (closed) return points[((i % points.length) + points.length) % points.length];
    return points[Math.max(0, Math.min(points.length - 1, i))];
  };

  const last = closed ? points.length : points.length - 1;
  let d = `M${f(points[0].x)} ${f(points[0].y)}`;

  for (let i = 0; i < last; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }

  return closed ? `${d} Z` : d;
}

/**
 * An irregular closed shape — the single most reused primitive in the scene.
 * Clouds, foliage masses, rocks, patches of darker vegetation and the crowns of
 * the distant forest are all blobs with different settings.
 *
 * Points are placed around a circle, then each one is pushed in or out by up to
 * `wobble` and nudged around the ring, so no two lobes are the same size and
 * the silhouette never resolves into an ellipse.
 */
export function blobPath(
  rand: Rng,
  opts: {
    radius: number;
    /** 0 = circle, 0.5 = very lumpy. */
    wobble?: number;
    points?: number;
    /** <1 flattens vertically. Clouds want ~0.5, rocks ~0.6, foliage ~0.85. */
    squash?: number;
    cx?: number;
    cy?: number;
  },
): string {
  const { radius, wobble = 0.22, points = 9, squash = 1, cx = 0, cy = 0 } = opts;
  const step = (Math.PI * 2) / points;

  const ring: Point[] = [];
  for (let i = 0; i < points; i += 1) {
    const angle = i * step + rand.around(0, step * 0.28);
    const r = radius * (1 + rand.around(0, wobble));
    ring.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * squash });
  }

  return catmullRomPath(ring, true);
}

/** Linear interpolation of a sampled polyline — used to sit things (trees,
 *  fence posts, the footpath) exactly on a generated ridge. */
export function sampleAt(points: Point[], x: number): number {
  if (points.length === 0) return 0;
  if (x <= points[0].x) return points[0].y;
  const end = points[points.length - 1];
  if (x >= end.x) return end.y;

  for (let i = 1; i < points.length; i += 1) {
    const b = points[i];
    if (b.x >= x) {
      const a = points[i - 1];
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return end.y;
}
