/**
 * The land: five low green rises generated from noise, and the things that sit
 * on them.
 *
 * This started life as an eight-layer mountain range running back for miles,
 * and it was the single biggest reason the world felt lonely. Scale is not
 * neutral — a landscape that recedes forever puts the viewer *outside* it,
 * looking on, and the emotion that comes back is awe or wistfulness. Neither is
 * what this book is about.
 *
 * So the hills are now short, soft and close: a shallow green bowl you could
 * walk across in an afternoon, with the far side near enough to see the flowers
 * on it. Every ridge is still generated from fractal noise, so it has knolls
 * and dips and no two are alike, but the amplitudes are gentle and there are no
 * peaks. `depth` (1 = the far side of the garden, 0 = the bank at your feet)
 * drives colour, softness and how much detail a layer carries, and the ramp
 * only travels about two-thirds of the way to the sky colour — the far side of
 * this place is bright and green, not hazed out.
 *
 * All coordinates are in the hill SVG's user space (`HILL_VIEW`), which is
 * stretched to the viewport with `preserveAspectRatio="none"`.
 */
import { fbm1D, makeNoise1D } from "./noise";
import { blobPath, catmullRomPath, sampleAt, type Point } from "./path";
import { makeRng } from "./rng";

export const HILL_VIEW = { width: 1440, height: 520 } as const;

/** Ridges are drawn wider than the viewBox so the displacement filter can chew
 *  on their ends without exposing a straight cut at the screen edge. */
const OVERDRAW = 80;

export type RidgeSpec = {
  id: string;
  seed: number;
  /** 1 = farthest range, 0 = nearest bank. Drives colour, blur, detail. */
  depth: number;
  /** Resting height of the ridge in view units, before noise. */
  baseline: number;
  /** How far the noise is allowed to lift and drop the ridge. */
  amplitude: number;
  /** Noise frequency. Higher = more, smaller undulations. */
  roughness: number;
  /** Nudges the layer's pigment back toward sunlight; see `depthPigment`. */
  warmth: number;
  /** Octaves of noise. The far range gets more, which is what makes it read as
   *  rock rather than as a grassy swell. */
  octaves?: number;
  gain?: number;
  /** Tree crowns strung along the ridgeline. 0 = bare. */
  forest?: number;
  /** Blurred masses of darker vegetation on the slope below the ridge. */
  patches?: number;
};

/**
 * Five rises, low and close.
 *
 * The horizon sits at roughly a third of the way down the frame rather than a
 * tenth, which is what makes the garden feel enclosing instead of vast. The
 * treelines thin out as they come forward, because the far side of the bowl is
 * where the woods are and the near side is where the flowers are.
 */
export const RIDGES: readonly RidgeSpec[] = [
  { id: "far", seed: 9931, depth: 0.82, baseline: 178, amplitude: 27, roughness: 1.55, warmth: 0.12, forest: 34 },
  { id: "middle", seed: 8123, depth: 0.6, baseline: 234, amplitude: 27, roughness: 1.3, warmth: 0.2, forest: 24, patches: 3 },
  { id: "knoll", seed: 3389, depth: 0.42, baseline: 292, amplitude: 29, roughness: 1.1, warmth: 0.3, forest: 11, patches: 4 },
  { id: "near", seed: 6641, depth: 0.25, baseline: 356, amplitude: 25, roughness: 0.95, warmth: 0.4, patches: 5 },
  { id: "bank", seed: 5051, depth: 0.1, baseline: 428, amplitude: 21, roughness: 0.85, warmth: 0.5, patches: 5 },
] as const;

/**
 * The ridgeline itself, as sampled points.
 *
 * Two noise fields are summed rather than one: a low-frequency `tilt` that
 * makes each ridge lean as a whole (so the range isn't level like a graph
 * axis), and the fbm that carries the actual terrain detail.
 */
export function ridgeSamples(spec: RidgeSpec, samples = 88): Point[] {
  const detail = makeNoise1D(spec.seed);
  const tilt = makeNoise1D(spec.seed + 7717);
  const span = HILL_VIEW.width + OVERDRAW * 2;
  const points: Point[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const x = -OVERDRAW + t * span;
    const n = fbm1D(detail, t * 6 * spec.roughness, spec.octaves ?? 4, 2.07, spec.gain ?? 0.48);
    const lean = tilt(t * 1.3) * spec.amplitude * 0.45;
    points.push({ x, y: spec.baseline - n * spec.amplitude - lean });
  }

  return points;
}

/** Ridgeline closed down to the bottom of the frame — the filled hill body. */
export function ridgeBody(points: Point[]): string {
  const floor = HILL_VIEW.height + 40;
  return `${catmullRomPath(points)} L${HILL_VIEW.width + OVERDRAW} ${floor} L${-OVERDRAW} ${floor} Z`;
}

/**
 * A band hugging the top of a ridge, used for the lit rim on the sun-facing
 * side and for the cooler shadow that falls away from it. Thickness varies
 * along its length so it never reads as an offset stroke.
 */
export function ridgeBand(
  points: Point[],
  from: number,
  to: number,
  thickness: number,
  seed: number,
): string {
  const wobble = makeNoise1D(seed);
  const top = points.filter((p) => p.x >= from && p.x <= to);
  if (top.length < 3) return "";

  const bottom = top
    .map((p, i) => ({
      x: p.x,
      y: p.y + thickness * (0.55 + 0.45 * (wobble(i * 0.35) * 0.5 + 0.5)),
    }))
    .reverse();

  return catmullRomPath([...top, ...bottom], true);
}

export type Crown = { d: string; x: number };

/**
 * Tree crowns along a ridge, read as a distant forest.
 *
 * Spacing is jittered and heights are drawn from `rand.mid`, so the treeline
 * has clumps and gaps in it. Evenly spaced crowns of equal height look like a
 * comb, which is the single fastest way to make a landscape look generated.
 */
export function forestCrowns(points: Point[], spec: RidgeSpec, count: number): Crown[] {
  const rand = makeRng(spec.seed + 313);
  const crowns: Crown[] = [];
  const scale = 1 - spec.depth * 0.45;

  let x = -OVERDRAW * 0.5;
  for (let i = 0; i < count; i += 1) {
    x += rand.float(HILL_VIEW.width / count * 0.45, (HILL_VIEW.width / count) * 1.5);
    if (x > HILL_VIEW.width + OVERDRAW * 0.5) break;

    // Clumps: every so often a crown crowds up against the previous one.
    const cx = rand.chance(0.35) ? x - rand.float(2, 9) : x;
    const r = rand.mid(5, 13) * scale;
    const cy = sampleAt(points, cx) - r * rand.float(0.5, 0.85);

    crowns.push({
      x: cx,
      // Rounder than wide. A treeline of tall narrow crowns reads as conifers,
      // and conifers read as cold — these are broadleaf, the kind you sit under.
      d: blobPath(rand, {
        cx,
        cy,
        radius: r,
        wobble: 0.32,
        points: rand.int(7, 9),
        squash: rand.float(0.74, 1.02),
      }),
    });
  }

  return crowns;
}

export type Bloom = { x: number; y: number; r: number; hue: number };

/**
 * Flowers on the hillsides, as dots of colour.
 *
 * At this distance a flower is one or two pixels — there is no shape to draw,
 * only a speck. But specks of pink and butter and white scattered over green
 * are what tell you the far side of the garden is *also* full of flowers, not
 * just the bit you are standing in. Without them the meadow stops at the
 * foreground and the world beyond it looks mown.
 *
 * They cluster, like everything else here: `drift` picks a centre and the
 * flowers land around it.
 */
export function slopeBlooms(points: Point[], spec: RidgeSpec, count: number): Bloom[] {
  const rand = makeRng(spec.seed + 4231);
  const blooms: Bloom[] = [];
  const scale = 1 - spec.depth * 0.55;

  for (let drift = 0; drift < count; drift += 1) {
    const centre = rand.float(-40, HILL_VIEW.width + 40);
    const spread = rand.float(50, 190);
    const hue = rand.int(0, 3);

    for (let i = 0; i < rand.int(4, 11); i += 1) {
      const x = centre + rand.around(0, spread);
      blooms.push({
        x,
        y: sampleAt(points, x) + rand.float(4, 46) * (1 - spec.depth * 0.5),
        r: rand.float(1, 2.6) * scale,
        hue,
      });
    }
  }

  return blooms;
}

/**
 * Masses of darker vegetation on a slope — hedgerows, scrub, a stand of trees
 * seen from above. These are what stop a hill being one flat fill: real
 * hillsides are mottled, and the mottling is what tells you they have texture.
 */
export function slopePatches(points: Point[], spec: RidgeSpec, count: number): string[] {
  const rand = makeRng(spec.seed + 977);
  const patches: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const cx = rand.float(-40, HILL_VIEW.width + 40);
    const ridgeY = sampleAt(points, cx);
    const drop = rand.float(12, 58) * (1 - spec.depth * 0.5);
    patches.push(
      blobPath(rand, {
        cx,
        cy: ridgeY + drop,
        radius: rand.mid(26, 84) * (1 - spec.depth * 0.4),
        wobble: 0.4,
        points: rand.int(7, 10),
        squash: rand.float(0.26, 0.44),
      }),
    );
  }

  return patches;
}
