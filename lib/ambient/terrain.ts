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
 * ## Coordinates, and why there are two sets of them
 *
 * All coordinates are in the hill SVG's user space, which is stretched to its
 * box with `preserveAspectRatio="none"`. That attribute is why this file is
 * parameterised by `Composition` at all: `none` *distorts*, so a single set of
 * coordinates authored for a wide frame comes out squeezed in a tall one. Each
 * composition therefore carries its own view box — sized so its aspect matches
 * the box the SVG is actually drawn into — and its own ridges, prop placement
 * and object scale to go in it. See `composition.ts` for the full account.
 *
 * Reading a number below only makes sense against its stage's `view` and
 * `scale`. Landscape's user unit is one CSS pixel; portrait's is about 1.34,
 * because a tall frame shows less of the world across and the things in it have
 * to grow to match.
 */
import type { Composition } from "./composition";
import { fbm1D, makeNoise1D } from "./noise";
import { blobPath, catmullRomPath, sampleAt, type Point } from "./path";
import { makeRng } from "./rng";

export type RidgeId = "far" | "middle" | "knoll" | "near" | "bank";

/**
 * The brush bank's half of a ridge: which filter it is painted with, and the
 * depth that tunes that filter.
 *
 * Split out from the shapes below because `PaintFilters` builds one filter per
 * entry here, keyed by `id` and tuned by `depth` and by *index* — so both
 * compositions must present the same ids, in the same order, meaning the same
 * distances, or a portrait ridge would be painted with a brush belonging to a
 * different distance. Deriving both stages from this one list is what makes
 * that impossible to get wrong, rather than a comment asking nicely.
 */
export const RIDGE_BRUSHES = [
  { id: "far", depth: 0.82 },
  { id: "middle", depth: 0.6 },
  { id: "knoll", depth: 0.42 },
  { id: "near", depth: 0.25 },
  { id: "bank", depth: 0.1 },
] as const satisfies readonly { id: RidgeId; depth: number }[];

export type RidgeSpec = {
  id: RidgeId;
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

/** A ridge's shape, without the parts the brush bank owns. */
type RidgeShape = Omit<RidgeSpec, "id" | "depth">;

function ridges(shapes: readonly RidgeShape[]): readonly RidgeSpec[] {
  return RIDGE_BRUSHES.map((brush, i) => ({ ...brush, ...shapes[i] }));
}

export type HillView = { readonly width: number; readonly height: number };

/**
 * Everything about how the hills are staged in one frame shape.
 *
 * This is the "authored portrait composition" the correction in `plates.ts`
 * asked for, in the one place a future session can read it end to end.
 */
export type HillStage = {
  /**
   * The SVG's user space. Its aspect is chosen to match the box below, which
   * is the whole reason `preserveAspectRatio="none"` stops distorting.
   */
  readonly view: HillView;
  /** Ridges are drawn wider than the view so the displacement filter can chew
   *  on their ends without exposing a straight cut at the screen edge. */
  readonly overdraw: number;
  /**
   * How large an object of a given real-world size is, in this stage's units,
   * relative to landscape. Portrait shows less of the world across, so its unit
   * is bigger and everything measured in units has to shrink to compensate —
   * one number, applied to every prop, patch, crown and band, so the two
   * compositions cannot drift into different-sized worlds.
   */
  readonly scale: number;
  readonly ridges: readonly RidgeSpec[];
  /** The lit band along the crest, where the afternoon lands, in view units. */
  readonly crest: { readonly from: number; readonly to: number };
  /** The cool band on the side turned away from the sun, in view units. */
  readonly shade: { readonly from: number; readonly to: number };
  /** Drifts of hill flowers per ridge: `base + round(spread * (1 - depth))`. */
  readonly blooms: { readonly base: number; readonly spread: number };
  /** Where the story's objects stand. */
  readonly props: HillProps;
  /** The box the SVG is drawn into, as Tailwind classes plus its bottom
   *  offset — extended below the viewport so parallax can lift the layer
   *  without exposing the page underneath. */
  readonly frame: { readonly bottom: number; readonly heightClass: string };
};

/**
 * Placement for everything two people have left lying around.
 *
 * Positions are absolute in view units rather than fractions, because this is
 * composition rather than layout: the bench belongs *on that rise, facing that
 * way*, and a fraction of the width would move it to wherever the arithmetic
 * put it. Sizes carry the stage `scale` already applied.
 */
type HillProps = {
  readonly stream: { readonly x: number; readonly seed: number };
  readonly bridge: { readonly x: number; readonly width: number; readonly drop: number };
  readonly fence: {
    readonly from: number;
    readonly to: number;
    readonly count: number;
    readonly height: number;
    readonly seed: number;
  };
  readonly lanterns: {
    /** Which two fence posts the string is slung between. */
    readonly fromPost: number;
    readonly toPost: number;
    readonly count: number;
    readonly sag: number;
    readonly seed: number;
  };
  readonly bench: { readonly x: number; readonly width: number; readonly seed: number };
  readonly path: {
    readonly start: Point;
    readonly end: Point;
    /** Width where it leaves the bottom of the frame. */
    readonly width: number;
    /** Width it never tapers below, where it goes over the knoll. */
    readonly tail: number;
    /** The two out-of-phase sways that stop it reading as a recognisable S. */
    readonly sway: readonly [number, number];
  };
  readonly stones: {
    /** Indices into the path's centreline — its lower, nearer stretch. */
    readonly from: number;
    readonly to: number;
    readonly count: number;
    readonly seed: number;
  };
};

/**
 * The wide frame: the composition the garden was designed in.
 *
 * The horizon sits at roughly a third of the way down the band rather than a
 * tenth, which is what makes the garden feel enclosing instead of vast. The
 * treelines thin out as they come forward, because the far side of the bowl is
 * where the woods are and the near side is where the flowers are.
 *
 * **These numbers are load-bearing history.** They are the composition that has
 * shipped since the scene was built, and the landscape plates in
 * `public/plates/` are photographs of them. Changing one here changes a
 * committed image that nothing will tell you has gone stale.
 */
const LANDSCAPE: HillStage = {
  view: { width: 1440, height: 520 },
  overdraw: 80,
  scale: 1,
  ridges: ridges([
    { seed: 9931, baseline: 178, amplitude: 27, roughness: 1.55, warmth: 0.12, forest: 34 },
    { seed: 8123, baseline: 234, amplitude: 27, roughness: 1.3, warmth: 0.2, forest: 24, patches: 3 },
    { seed: 3389, baseline: 292, amplitude: 29, roughness: 1.1, warmth: 0.3, forest: 11, patches: 4 },
    { seed: 6641, baseline: 356, amplitude: 25, roughness: 0.95, warmth: 0.4, patches: 5 },
    { seed: 5051, baseline: 428, amplitude: 21, roughness: 0.85, warmth: 0.5, patches: 5 },
  ]),
  crest: { from: 480, to: 1530 },
  shade: { from: -90, to: 620 },
  blooms: { base: 3, spread: 3 },
  props: {
    stream: { x: 476, seed: 1487 },
    bridge: { x: 448, width: 86, drop: 24 },
    fence: { from: 44, to: 596, count: 11, height: 26, seed: 733 },
    lanterns: { fromPost: 2, toPost: 7, count: 5, sag: 13, seed: 219 },
    bench: { x: 1034, width: 62, seed: 907 },
    path: {
      start: { x: 1016, y: 550 },
      end: { x: 704, y: 292 },
      width: 82,
      tail: 2.5,
      sway: [46, 13],
    },
    stones: { from: 3, to: 8, count: 5, seed: 611 },
  },
  /*
   * Taller below `sm`: a phone's viewport is a lot more vertical than a desktop
   * window, and `vh` sizing alone gave every device the same 48%, which on a
   * tall narrow screen reads as a wide plain band of sky above a comparatively
   * squeezed strip of hills. This is the *old* mitigation for the tall-frame
   * problem, kept because it is what the landscape composition still does when
   * it lands on a narrow screen — as the fallback for a band whose plate has
   * not been baked. The real answer is the portrait stage below.
   */
  frame: {
    bottom: -52,
    heightClass:
      "h-[calc(60vh_+_52px)] min-h-[420px] sm:h-[calc(48vh_+_52px)] sm:min-h-[360px]",
  },
};

/**
 * The tall frame: the same garden, staged for a phone held upright.
 *
 * Three decisions carry it, and they are the three the stretched version got
 * wrong for free:
 *
 * 1. **The view box is 320x540 against a box that is 72vh + 52px tall**, which
 *    on a 430x932 phone is 430x723 — an aspect of 0.595 against the view's
 *    0.593. That is the fix. Nothing is stretched because there is nothing left
 *    to stretch; the residual quarter of a percent is not a thing eyes have.
 * 2. **The horizon moves up, to about 38% down the frame** (the far ridge's
 *    baseline of 70 units lands near y=355 of 932). Stretched, it sat at 57%
 *    and the picture was mostly sky. A tall frame wants more land, not more
 *    air: the sky is the part with nothing in it, and on a phone it is the part
 *    the reading text is sitting on anyway.
 * 3. **Everything in it is scaled to 0.62 units**, which — since a portrait
 *    unit is ~1.34 CSS pixels — puts every object at roughly 0.83x its
 *    landscape *pixel* size while making it nearly three times as large a share
 *    of the frame's width. That is the correct trade for a narrow window onto
 *    the same world: you see less of it, so what you do see is closer.
 *
 * The ridges are rougher per unit of width and gentler per unit of screen: a
 * frame a third as wide showing the same undulation count would read as
 * corrugation, so the roughness comes down to keep the wavelength on screen
 * about where it was.
 */
const PORTRAIT: HillStage = {
  view: { width: 320, height: 540 },
  overdraw: 24,
  scale: 0.62,
  ridges: ridges([
    { seed: 9931, baseline: 70, amplitude: 24, roughness: 0.55, warmth: 0.12, forest: 11 },
    { seed: 8123, baseline: 128, amplitude: 25, roughness: 0.48, warmth: 0.2, forest: 8, patches: 2 },
    { seed: 3389, baseline: 195, amplitude: 27, roughness: 0.42, warmth: 0.3, forest: 4, patches: 2 },
    { seed: 6641, baseline: 272, amplitude: 24, roughness: 0.36, warmth: 0.4, patches: 3 },
    { seed: 5051, baseline: 358, amplitude: 20, roughness: 0.32, warmth: 0.5, patches: 3 },
  ]),
  crest: { from: 107, to: 340 },
  shade: { from: -20, to: 138 },
  blooms: { base: 2, spread: 2 },
  /*
   * The story, re-staged rather than re-scaled. The fence still runs down the
   * left and recedes, the bench still sits right and faces the light, the creek
   * still falls through a fold in the land, and the path still leaves the
   * bottom of the frame — but each one is placed against *this* frame's ridges,
   * because the ridges are at different heights and `sampleAt` puts every
   * object on the ground it actually finds.
   *
   * **The creek and bridge move right, and that is the one deliberate
   * departure from the wide frame's arrangement.** In landscape the tree sits
   * at 17% and the bridge at 31%, with clear ground between them — the bridge
   * stands out in the open where you can see it. A tall frame shows so much
   * less of the world across that a tree big enough to still read as *the* tree
   * has a canopy reaching 44%, which swallowed the fold whole. Keeping the
   * left-to-right order of the story (fence, tree, creek, path, bench) and
   * spacing it for this frame preserves the relationship; keeping the
   * fractions would have preserved only the numbers.
   *
   * The path is proportionally wider here (51 of 320 against 82 of 1440) and
   * wanders less. Both follow from the frame: a path leaving the bottom of a
   * narrow picture is nearer the viewer, and a near path is wide and goes
   * roughly where it is pointed.
   */
  props: {
    stream: { x: 172, seed: 1487 },
    bridge: { x: 166, width: 53, drop: 15 },
    fence: { from: 8, to: 96, count: 8, height: 16, seed: 733 },
    lanterns: { fromPost: 2, toPost: 6, count: 4, sag: 8, seed: 219 },
    bench: { x: 288, width: 38, seed: 907 },
    path: {
      start: { x: 250, y: 570 },
      end: { x: 205, y: 195 },
      width: 51,
      tail: 1.6,
      sway: [16, 4.5],
    },
    stones: { from: 3, to: 8, count: 4, seed: 611 },
  },
  frame: { bottom: -52, heightClass: "h-[calc(72vh_+_52px)] min-h-[420px]" },
};

export const HILL_STAGE: Record<Composition, HillStage> = {
  landscape: LANDSCAPE,
  portrait: PORTRAIT,
};

/**
 * The ridgeline itself, as sampled points.
 *
 * Two noise fields are summed rather than one: a low-frequency `tilt` that
 * makes each ridge lean as a whole (so the range isn't level like a graph
 * axis), and the fbm that carries the actual terrain detail.
 */
export function ridgeSamples(spec: RidgeSpec, stage: HillStage, samples = 88): Point[] {
  const detail = makeNoise1D(spec.seed);
  const tilt = makeNoise1D(spec.seed + 7717);
  const span = stage.view.width + stage.overdraw * 2;
  const points: Point[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const x = -stage.overdraw + t * span;
    const n = fbm1D(detail, t * 6 * spec.roughness, spec.octaves ?? 4, 2.07, spec.gain ?? 0.48);
    const lean = tilt(t * 1.3) * spec.amplitude * 0.45;
    points.push({ x, y: spec.baseline - n * spec.amplitude - lean });
  }

  return points;
}

/** Ridgeline closed down to the bottom of the frame — the filled hill body. */
export function ridgeBody(points: Point[], stage: HillStage): string {
  const floor = stage.view.height + 40;
  return (
    `${catmullRomPath(points)} L${stage.view.width + stage.overdraw} ${floor}` +
    ` L${-stage.overdraw} ${floor} Z`
  );
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
export function forestCrowns(
  points: Point[],
  spec: RidgeSpec,
  count: number,
  stage: HillStage,
): Crown[] {
  const rand = makeRng(spec.seed + 313);
  const crowns: Crown[] = [];
  const scale = (1 - spec.depth * 0.45) * stage.scale;
  const step = stage.view.width / count;

  let x = -stage.overdraw * 0.5;
  for (let i = 0; i < count; i += 1) {
    x += rand.float(step * 0.45, step * 1.5);
    if (x > stage.view.width + stage.overdraw * 0.5) break;

    // Clumps: every so often a crown crowds up against the previous one.
    const cx = rand.chance(0.35) ? x - rand.float(2, 9) * stage.scale : x;
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
export function slopeBlooms(
  points: Point[],
  spec: RidgeSpec,
  count: number,
  stage: HillStage,
): Bloom[] {
  const rand = makeRng(spec.seed + 4231);
  const blooms: Bloom[] = [];
  const scale = (1 - spec.depth * 0.55) * stage.scale;

  for (let drift = 0; drift < count; drift += 1) {
    const centre = rand.float(-40 * stage.scale, stage.view.width + 40 * stage.scale);
    const spread = rand.float(50, 190) * stage.scale;
    const hue = rand.int(0, 3);

    for (let i = 0; i < rand.int(4, 11); i += 1) {
      const x = centre + rand.around(0, spread);
      blooms.push({
        x,
        y:
          sampleAt(points, x) +
          rand.float(4, 46) * stage.scale * (1 - spec.depth * 0.5),
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
export function slopePatches(
  points: Point[],
  spec: RidgeSpec,
  count: number,
  stage: HillStage,
): string[] {
  const rand = makeRng(spec.seed + 977);
  const patches: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const cx = rand.float(-40 * stage.scale, stage.view.width + 40 * stage.scale);
    const ridgeY = sampleAt(points, cx);
    const drop = rand.float(12, 58) * stage.scale * (1 - spec.depth * 0.5);
    patches.push(
      blobPath(rand, {
        cx,
        cy: ridgeY + drop,
        radius: rand.mid(26, 84) * stage.scale * (1 - spec.depth * 0.4),
        wobble: 0.4,
        points: rand.int(7, 10),
        squash: rand.float(0.26, 0.44),
      }),
    );
  }

  return patches;
}
