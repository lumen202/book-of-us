/**
 * Clouds, built as masses rather than as silhouettes.
 *
 * The failure mode being avoided: four overlapping ellipses in a single flat
 * fill. That produces a *sticker* — an outline with nothing inside it — and it
 * is what the previous backdrop had.
 *
 * A cloud here is a chain of lobes with three tonal passes over it, painted in
 * the order a person would paint them: the cool shaded underside first so it
 * shows as a rim along the bottom, then the body over most of it, then a few
 * small strokes on the upper right where the sun actually reaches. Add the
 * displacement brush and the dissolve mask from `PaintFilters` and the result
 * has a top edge that catches light, a bottom edge that sits in its own shadow,
 * and shoulders that lose themselves in the sky.
 *
 * These are deliberately *fat* clouds — round lobes, piled high, more of them
 * than a real cumulus would have. Tall dramatic clouds mean weather is coming;
 * flat streaky ones mean a front. Round ones piled up on a flat base mean a
 * good afternoon, and they are the ones you lie in the grass and look at.
 *
 * Coordinates are in `CLOUD_VIEW`; the component stretches that to whatever
 * width the cloud should be.
 */
import { blobPath } from "./path";
import { makeRng } from "./rng";

export const CLOUD_VIEW = { width: 400, height: 200 } as const;

export type CloudMass = {
  /** Cool underside. Drawn first, sits proud of the body along the bottom. */
  shade: string[];
  body: string[];
  /** The handful of strokes the sun is on. */
  lit: string[];
  /** Torn shreds trailing off the mass, painted with the softest brush. */
  wisps: string[];
};

export function cloudMass(seed: number): CloudMass {
  const rand = makeRng(seed);
  const mass: CloudMass = { shade: [], body: [], lit: [], wisps: [] };

  // The spine: lobes of falling and rising size along a roughly flat base.
  // Cumulus sits on a flat bottom and piles up unevenly on top, so `cy` is
  // derived from the radius rather than chosen independently.
  const base = 136;
  const lobes: { cx: number; cy: number; r: number }[] = [];
  let x = rand.float(40, 70);

  for (let i = 0; i < 11; i += 1) {
    const r = rand.mid(32, 68);
    lobes.push({ cx: x, cy: base - r * rand.float(0.35, 0.78), r });
    // Lobes crowd into each other rather than sitting in a row, which is what
    // makes the silhouette bumpy instead of scalloped.
    x += r * rand.float(0.62, 1.05);
    if (x > CLOUD_VIEW.width - 34) break;
  }

  // A second, smaller tier piled on top of the first — height without drama.
  const upper = lobes.length;
  for (let i = 1; i < upper - 1; i += 1) {
    if (!rand.chance(0.5)) continue;
    const under = lobes[i];
    lobes.push({
      cx: under.cx + rand.around(0, under.r * 0.4),
      cy: under.cy - under.r * rand.float(0.5, 0.85),
      r: under.r * rand.float(0.42, 0.68),
    });
  }

  for (const lobe of lobes) {
    mass.shade.push(
      blobPath(rand, {
        cx: lobe.cx + rand.around(0, 6),
        cy: lobe.cy + lobe.r * 0.42,
        radius: lobe.r * rand.float(0.82, 1.02),
        wobble: 0.24,
        points: rand.int(8, 11),
        squash: rand.float(0.56, 0.78),
      }),
    );

    mass.body.push(
      blobPath(rand, {
        cx: lobe.cx,
        cy: lobe.cy,
        radius: lobe.r,
        wobble: 0.26,
        points: rand.int(9, 12),
        // Rounder than the old version. Squashed lobes read as stretched and
        // windblown; round ones read as still and warm.
        squash: rand.float(0.78, 1),
      }),
    );

    // Only the upper right of the bigger lobes takes light, and not all of
    // them — an evenly rimmed cloud looks embossed.
    if (lobe.r > 36 && rand.chance(0.72)) {
      mass.lit.push(
        blobPath(rand, {
          cx: lobe.cx + lobe.r * rand.float(0.16, 0.44),
          cy: lobe.cy - lobe.r * rand.float(0.3, 0.6),
          radius: lobe.r * rand.float(0.3, 0.52),
          wobble: 0.34,
          points: rand.int(7, 10),
          squash: rand.float(0.55, 0.85),
        }),
      );
    }
  }

  // A flat, spread-out base tying the lobes together into one cloud.
  mass.body.push(
    blobPath(rand, {
      cx: CLOUD_VIEW.width / 2 + rand.around(0, 30),
      cy: base + rand.float(2, 12),
      radius: rand.float(120, 168),
      wobble: 0.2,
      points: 12,
      squash: rand.float(0.14, 0.24),
    }),
  );

  for (let i = 0; i < rand.int(2, 4); i += 1) {
    mass.wisps.push(
      blobPath(rand, {
        cx: rand.float(20, CLOUD_VIEW.width - 20),
        cy: base + rand.around(-30, 34),
        radius: rand.float(40, 96),
        wobble: 0.44,
        points: rand.int(8, 11),
        squash: rand.float(0.1, 0.22),
      }),
    );
  }

  return mass;
}

export type CloudSpec = {
  seed: number;
  /** Which distance band — drives speed, size, contrast and parallax. */
  band: 0 | 1 | 2;
  top: string;
  /** Resting horizontal position, in vw. Under reduced motion the drift stops
   *  and this is where the cloud stays, so these compose a still sky on their
   *  own. */
  rest: number;
  /** Width, in vw. */
  width: number;
  duration: number;
  delay: number;
  opacity: number;
  /** Alternate dissolve mask, so no two clouds fade the same way. */
  alt?: boolean;
};

/**
 * Six clouds in three distance bands — one fewer, and each one bigger.
 *
 * Durations share no small common factor and range over more than four minutes,
 * so the sky never returns to an arrangement you have seen before within any
 * plausible visit. Far clouds are slower, smaller and paler; near clouds are
 * big, faster and hold their contrast.
 *
 * The gaps between them matter as much as the clouds do. The brief asks for
 * lots of open sky, and open sky is what makes a day feel good — a crowded sky
 * is a closing-in sky. Nothing is placed below 26% of the viewport height
 * either, which keeps the whole middle of the screen clear blue behind the
 * text.
 */
export const CLOUDS: readonly CloudSpec[] = [
  { seed: 1013, band: 0, top: "6%", rest: 6, width: 28, duration: 517, delay: -41, opacity: 0.52 },
  { seed: 2027, band: 0, top: "15%", rest: 64, width: 23, duration: 463, delay: -301, opacity: 0.42, alt: true },
  { seed: 3041, band: 1, top: "1%", rest: 34, width: 40, duration: 379, delay: -157, opacity: 0.76 },
  { seed: 4051, band: 1, top: "20%", rest: 80, width: 31, duration: 331, delay: -239, opacity: 0.58, alt: true },
  { seed: 5087, band: 2, top: "-6%", rest: 1, width: 50, duration: 263, delay: -97, opacity: 0.9 },
  { seed: 6089, band: 2, top: "23%", rest: 22, width: 35, duration: 227, delay: -191, opacity: 0.64, alt: true },
] as const;
