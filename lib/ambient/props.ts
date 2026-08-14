/**
 * The traces of two people: a swing, a bench facing the light, a bridge, a
 * path worn by walking it, stepping stones, a string of lanterns, a fence
 * someone keeps up.
 *
 * This is where the emotional work of the scene actually happens, and it is
 * worth being explicit about the method: **the story is told entirely by
 * objects that imply use.** There are no people in this world and there never
 * will be. But a swing has been sat on. A bench faces the sunset because
 * someone put it there to watch one. A bridge is where you stop in the middle.
 * Lanterns get hung for evenings that are expected to run long. A path exists
 * because it has been walked, repeatedly, by someone going somewhere they like.
 *
 * A viewer reads all of that without noticing they are reading it, and the
 * feeling that comes back is *this place belongs to somebody* — which is the
 * difference between a pretty landscape and somewhere you want to be. It is
 * also why they are drawn small and low-contrast and kept out of the reading
 * band: they work as implication, not as subject matter. The moment one of
 * these becomes something you *look at*, it stops working.
 *
 * Everything here is positioned *onto* generated terrain via `sampleAt`, not at
 * authored y coordinates — the ridges come out of noise, so nothing can assume
 * where the ground is.
 */
import { blobPath, catmullRomPath, sampleAt, type Point } from "./path";
import { makeRng } from "./rng";

/**
 * How large the objects in this composition are, relative to the wide frame
 * they were authored in. See `HillStage.scale` in `terrain.ts` — it is one
 * number per composition so the two cannot drift into different-sized worlds,
 * and it defaults to 1 here so every landscape call site is untouched.
 */
type Scaled = { scale?: number };

/**
 * A footpath climbing away from the viewer.
 *
 * Width tapers on a curve rather than linearly — perspective is not linear, and
 * a linear taper reads as a wedge rather than as distance. The centreline is
 * swayed by two out-of-phase sines so it wanders without ever repeating a
 * recognisable S.
 *
 * Where it starts and ends is composition, not geometry, so it comes in from
 * the stage rather than being authored here: a path leaving the bottom of a
 * tall frame is nearer the viewer than one leaving a wide frame, and it has to
 * be wider and wander less to read that way.
 */
export function footpath(opts: {
  start: Point;
  end: Point;
  /** Width where it leaves the bottom of the frame. */
  width: number;
  /** Width it never tapers below — the path goes over the knoll, it does not
   *  come to a point. */
  tail: number;
  sway: readonly [number, number];
}): { body: string; centre: Point[] } {
  const { start, end, width: mouth, tail, sway: [swayLong, swayShort] } = opts;
  const steps = 26;

  const centre: Point[] = [];
  const left: Point[] = [];
  const right: Point[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const sway = Math.sin(t * 3.4) * swayLong + Math.sin(t * 7.9 + 1.2) * swayShort;
    const x = start.x + (end.x - start.x) * t + sway * (1 - t * 0.55);
    const y = start.y + (end.y - start.y) * Math.pow(t, 0.82);
    const width = mouth * Math.pow(1 - t, 1.9) + tail;

    centre.push({ x, y });
    left.push({ x: x - width / 2, y });
    right.push({ x: x + width / 2, y });
  }

  return { body: catmullRomPath([...left, ...right.reverse()], true), centre };
}

export type FencePost = { x: number; y: number; height: number };

/**
 * A post-and-rail fence running away along a ridge. Posts lean by a degree or
 * two each and are not evenly spaced — a fence that measures true reads as a
 * CAD drawing.
 */
export function fenceLine(
  ridge: Point[],
  opts: { from: number; to: number; count: number; height: number; seed: number },
): { posts: FencePost[]; rails: string[] } {
  const rand = makeRng(opts.seed);
  const posts: FencePost[] = [];
  const span = opts.to - opts.from;

  for (let i = 0; i < opts.count; i += 1) {
    const t = i / (opts.count - 1);
    // Squared spacing so posts crowd together as the line recedes.
    const x = opts.from + span * Math.pow(t, 1.28) + rand.around(0, 5);
    posts.push({
      x,
      y: sampleAt(ridge, x) + 2,
      height: opts.height * (1 - t * 0.62) * rand.float(0.9, 1.08),
    });
  }

  const rail = (fraction: number) =>
    catmullRomPath(posts.map((p) => ({ x: p.x, y: p.y - p.height * fraction })));

  return { posts, rails: [rail(0.88), rail(0.5)] };
}

/**
 * A slip of water in a fold of the land. Deliberately small — it exists to
 * catch a stripe of sky and to give the bridge something to cross.
 */
export function stream(ridge: Point[], opts: { x: number; seed: number } & Scaled): string {
  const rand = makeRng(opts.seed);
  const s = opts.scale ?? 1;
  const steps = 14;
  const left: Point[] = [];
  const right: Point[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = opts.x + Math.sin(t * 2.6) * 30 * s - t * 46 * s;
    const y = sampleAt(ridge, x) + 16 * s + t * 74 * s;
    const width = (4 + t * 30) * s;
    left.push({ x: x - width / 2 + rand.around(0, 1.6) * s, y });
    right.push({ x: x + width / 2 + rand.around(0, 1.6) * s, y });
  }

  return catmullRomPath([...left, ...right.reverse()], true);
}

/**
 * A small arched footbridge. Three parts, because that is all it takes to read
 * as a bridge at this size: a deck that curves, a handrail above it, and two
 * legs going down into the shadow.
 */
export function bridge(
  ridge: Point[],
  opts: { x: number; width: number; drop?: number },
): { deck: string; rail: string; posts: string[] } {
  const { x, width, drop = 40 } = opts;
  const y = sampleAt(ridge, x) + drop;
  const half = width / 2;
  const arch = width * 0.19;
  const thickness = width * 0.075;

  const deck =
    `M${x - half} ${y} Q${x} ${y - arch} ${x + half} ${y - 2}` +
    ` L${x + half} ${y - 2 + thickness} Q${x} ${y - arch + thickness * 1.5} ${x - half} ${y + thickness} Z`;

  const rail =
    `M${x - half + 2} ${y - width * 0.16} Q${x} ${y - arch - width * 0.15} ${x + half - 2} ${y - width * 0.17}`;

  const posts = [-0.62, -0.2, 0.2, 0.62].map((f) => {
    const px = x + half * f;
    const top = y - arch * (1 - Math.abs(f) * 0.75);
    return `M${px} ${top} L${px} ${top - width * 0.15}`;
  });

  return { deck, rail, posts };
}

/**
 * A swing hanging from a branch.
 *
 * The one object in the garden that is unambiguously about two people: one
 * sits, one pushes. The ropes hang at a slight angle to each other and the seat
 * is not level, because a swing that has hung outdoors for years never is —
 * and that crookedness is the entire difference between "a swing" and "a swing
 * that has been used a thousand times".
 *
 * Returned as geometry only; the component hangs it off an `ambient-` class so
 * it drifts a couple of degrees, as if someone just got up.
 */
export function swing(
  anchor: Point,
  opts: { drop: number; width: number; seed: number },
): { ropes: string[]; seat: string; pivot: Point } {
  const rand = makeRng(opts.seed);
  const half = opts.width / 2;
  // The seat hangs a touch off true, and one rope is fractionally longer.
  const tilt = rand.around(0, opts.drop * 0.035);
  const lean = rand.around(0, 2.2);

  const leftFoot = { x: anchor.x - half + lean, y: anchor.y + opts.drop - tilt };
  const rightFoot = { x: anchor.x + half + lean, y: anchor.y + opts.drop + tilt };

  const ropes = [
    catmullRomPath([
      { x: anchor.x - half * 0.5, y: anchor.y },
      { x: anchor.x - half * 0.8 + lean * 0.5, y: anchor.y + opts.drop * 0.55 },
      leftFoot,
    ]),
    catmullRomPath([
      { x: anchor.x + half * 0.5, y: anchor.y },
      { x: anchor.x + half * 0.8 + lean * 0.5, y: anchor.y + opts.drop * 0.55 },
      rightFoot,
    ]),
  ];

  const thickness = opts.width * 0.13;
  const seat =
    `M${leftFoot.x - 3} ${leftFoot.y}` +
    ` L${rightFoot.x + 3} ${rightFoot.y}` +
    ` L${rightFoot.x + 3} ${rightFoot.y + thickness}` +
    ` L${leftFoot.x - 3} ${leftFoot.y + thickness} Z`;

  return { ropes, seat, pivot: anchor };
}

/**
 * A bench, turned to face the light rather than to face the viewer.
 *
 * Small enough for two. Which way it points is the whole point: furniture
 * aimed at a view is furniture someone sits in on purpose.
 */
export function bench(
  ridge: Point[],
  opts: { x: number; width: number; seed: number },
): { seat: string; back: string; legs: string[]; arms: string[] } {
  const rand = makeRng(opts.seed);
  const y = sampleAt(ridge, opts.x) + 4;
  const w = opts.width;
  const h = w * 0.34;
  const lean = rand.around(0, 1.4);

  const seatY = y - h * 0.52;
  const seat = `M${opts.x - w / 2} ${seatY} L${opts.x + w / 2} ${seatY + rand.around(0, 0.8)} L${
    opts.x + w / 2
  } ${seatY + h * 0.16} L${opts.x - w / 2} ${seatY + h * 0.16} Z`;

  const backY = seatY - h * 0.72;
  const back = `M${opts.x - w / 2 + lean} ${backY} L${opts.x + w / 2 + lean} ${
    backY + rand.around(0, 1)
  } L${opts.x + w / 2 + lean} ${backY + h * 0.13} L${opts.x - w / 2 + lean} ${backY + h * 0.13} Z`;

  const legs = [-0.4, 0.4].map(
    (f) => `M${opts.x + w * f} ${seatY + h * 0.16} L${opts.x + w * f + rand.around(0, 1)} ${y}`,
  );
  const arms = [-0.5, 0.5].map(
    (f) => `M${opts.x + w * f} ${seatY} L${opts.x + w * f + lean} ${backY + h * 0.13}`,
  );

  return { seat, back, legs, arms };
}

/** Flat stones set into a crossing. Uneven, because they were placed by hand
 *  and then trodden on for years. */
export function steppingStones(
  from: Point,
  to: Point,
  opts: { count: number; seed: number } & Scaled,
): { d: string }[] {
  const rand = makeRng(opts.seed);
  const s = opts.scale ?? 1;
  return Array.from({ length: opts.count }, (_, i) => {
    const t = (i + 0.5) / opts.count;
    const cx = from.x + (to.x - from.x) * t + rand.around(0, 5) * s;
    const cy = from.y + (to.y - from.y) * t + rand.around(0, 3) * s;
    return {
      d: blobPath(rand, {
        cx,
        cy,
        radius: rand.mid(4.5, 9) * s,
        wobble: 0.28,
        points: rand.int(6, 8),
        squash: rand.float(0.34, 0.52),
      }),
    };
  });
}

/**
 * A picnic blanket under the cherry, with a basket and two cups.
 *
 * The hanami object: a blanket spread where the petals fall is the clearest
 * possible "two people were just here, and mean to come back" the scene can
 * hold without people in it. Two cups, not one, for the same reason the swing
 * seats one and implies a pusher.
 *
 * Drawn foreshortened — a quad wider than it is deep, back corners pulled in —
 * because a blanket seen from garden-eye height is a parallelogram, not a
 * square, and drawing it square is the fastest way to make the ground tilt.
 * One corner is lifted and folded back, because a blanket that lies perfectly
 * flat was never sat on. Straight edges with jitter, not curves: cloth pulls
 * straight between corners, and `brush-prop` supplies the wobble.
 */
export function picnic(
  at: Point,
  opts: { width: number; seed: number },
): {
  shade: string;
  blanket: string;
  fold: string;
  stripes: string[];
  basket: string;
  basketRim: string;
  handle: string;
  cups: { cx: number; cy: number; r: number }[];
} {
  const rand = makeRng(opts.seed);
  const w = opts.width;
  const j = () => rand.around(0, w * 0.02);

  // Corners: front, right, back, left — a foreshortened quad, slightly askew.
  const front: Point = { x: at.x + j(), y: at.y + j() };
  const right: Point = { x: at.x + w * 0.52 + j(), y: at.y - w * 0.16 + j() };
  const back: Point = { x: at.x + w * 0.06 + j(), y: at.y - w * 0.3 + j() };
  const left: Point = { x: at.x - w * 0.46 + j(), y: at.y - w * 0.13 + j() };

  const blanket =
    `M${front.x} ${front.y} L${right.x} ${right.y} L${back.x} ${back.y} L${left.x} ${left.y} Z`;

  // The lifted corner: a small triangle folded back over the front edge.
  const fold =
    `M${front.x} ${front.y}` +
    ` L${front.x + (right.x - front.x) * 0.22} ${front.y + (right.y - front.y) * 0.22}` +
    ` L${front.x + (back.x - front.x) * 0.16} ${front.y + (back.y - front.y) * 0.16 - w * 0.03} Z`;

  // A hint of check: two lines each way, interpolated between opposite edges.
  // Full gingham would make the blanket something you look at.
  const lerp = (a: Point, b: Point, t: number): Point => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const stripes: string[] = [];
  for (const t of [0.36, 0.68]) {
    const a1 = lerp(front, right, t);
    const b1 = lerp(left, back, t);
    stripes.push(`M${a1.x} ${a1.y} L${b1.x} ${b1.y}`);
    const a2 = lerp(front, left, t);
    const b2 = lerp(right, back, t);
    stripes.push(`M${a2.x} ${a2.y} L${b2.x} ${b2.y}`);
  }

  // The basket, toward the back edge where someone set it down out of the way.
  const bx = lerp(left, back, 0.62).x + w * 0.1;
  const by = lerp(left, back, 0.62).y - w * 0.01;
  const bw = w * 0.17;
  const bh = bw * 0.62;
  const basket =
    `M${bx - bw / 2} ${by - bh}` +
    ` L${bx + bw / 2} ${by - bh}` +
    ` L${bx + bw * 0.4} ${by} L${bx - bw * 0.4} ${by} Z`;
  const basketRim = `M${bx - bw / 2} ${by - bh} L${bx + bw / 2} ${by - bh}`;
  const handle =
    `M${bx - bw * 0.34} ${by - bh} Q${bx} ${by - bh - bw * 0.52} ${bx + bw * 0.34} ${by - bh}`;

  // Two cups, near the middle where two people would sit facing the tree.
  const cupR = w * 0.032;
  const c1 = lerp(lerp(front, back, 0.42), right, 0.2);
  const cups = [
    { cx: c1.x, cy: c1.y, r: cupR },
    { cx: c1.x + cupR * 3.4 + j(), cy: c1.y + cupR * 1.1 + j(), r: cupR * rand.float(0.9, 1.05) },
  ];

  // Soft contact shade under the whole arrangement.
  const shade = blobPath(rand, {
    cx: at.x + w * 0.02,
    cy: at.y - w * 0.14,
    radius: w * 0.56,
    wobble: 0.24,
    points: 9,
    squash: 0.3,
  });

  return { shade, blanket, fold, stripes, basket, basketRim, handle, cups };
}

/**
 * A string of little lanterns, slung between two points.
 *
 * The cord hangs in a real catenary rather than a straight line, and the lamps
 * are unevenly spaced along it. They are unlit in the afternoon — which is the
 * detail that does the work, because an unlit lantern is a promise about the
 * evening.
 */
export function lanternString(
  from: Point,
  to: Point,
  opts: { count: number; sag: number; seed: number } & Scaled,
): { cord: string; lamps: { x: number; y: number; r: number }[] } {
  const rand = makeRng(opts.seed);
  const s = opts.scale ?? 1;
  const at = (t: number) => ({
    x: from.x + (to.x - from.x) * t,
    // 4t(1-t) peaks at 1 in the middle and is 0 at both ends: a hanging cord.
    y: from.y + (to.y - from.y) * t + opts.sag * 4 * t * (1 - t),
  });

  const cord = catmullRomPath([at(0), at(0.25), at(0.5), at(0.75), at(1)]);
  const lamps = Array.from({ length: opts.count }, (_, i) => {
    const t = (i + 0.5) / opts.count + rand.around(0, 0.03);
    const point = at(t);
    const r = rand.float(2.6, 4.2) * s;
    return { x: point.x, y: point.y + r * 1.1, r };
  });

  return { cord, lamps };
}
