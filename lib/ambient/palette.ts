/**
 * The pigment box for the garden.
 *
 * Every colour in the scene is a `color-mix()` of design tokens — never a
 * literal hex. That is a hard invariant (see
 * `docs/agent/codebase-map/theming.md`): it is what lets the seasons re-tint
 * the world for free, and what stops the backdrop drifting out of the book's
 * palette over time. The tokens it mixes from are the four base ones plus the
 * six garden pigments (`--color-leaf`, `--color-blossom`, ...) — see
 * `gardenTokens` in `lib/theme/tokens.ts` for why those had to be added.
 *
 * The rules this palette is built on, and the reason it was rebuilt once:
 *
 * - **Desaturating toward brown makes things sad.** The first version of this
 *   file reached its greens by mixing the teal accent into the warm brown ink.
 *   That is the correct way to paint a wistful autumn hillside, and it is why
 *   the whole world came out olive and lonely. Nothing here mixes into `ink`
 *   any more except bark.
 * - **Shade is cool and coloured, never dark.** `shadow` below is a green-
 *   lavender, and it is used at low alpha. There is no black in this world and
 *   no grey; even the deepest thing in the picture is a colour you could name.
 * - **Light is butter, not orange.** Sunlight mixes from `--color-butter`,
 *   which keeps highlights golden instead of tipping the whole scene toward
 *   sunset melancholy.
 * - **Distance goes pale blue, not grey.** Far hills lose saturation into the
 *   sky's own colour, so the horizon reads as bright air rather than as haze.
 */

const T = {
  /**
   * What the world dilutes into — the colour of its air.
   *
   * Its own token rather than `--color-background` directly, and this is the
   * single most load-bearing indirection in the palette: the sky, the far air,
   * the pale grass at distance, the path and every horizon mix run through it,
   * so moving this one value re-derives the entire scene's light together. It
   * is how Celebration Mode takes the garden to night (see the
   * `data-celebration` block in globals.css) without a wash laid over the top
   * and without a second palette to maintain.
   *
   * It defaults to `--color-background`, so on any ordinary day this is exactly
   * what it always was. Note it is *not* the same thing as the page background
   * any more: the UI stays on `--color-background` while the world goes dark.
   */
  paper: "var(--color-scene-paper, var(--color-background))",
  surface: "var(--color-surface)",
  ink: "var(--color-ink)",
  inkMuted: "var(--color-ink-muted)",
  cool: "var(--color-accent)",
  coolWash: "var(--color-accent-muted)",
  warm: "var(--color-accent-warm)",
  /* garden */
  leaf: "var(--color-leaf)",
  leafDeep: "var(--color-leaf-deep)",
  blossom: "var(--color-blossom)",
  lilac: "var(--color-lilac)",
  butter: "var(--color-butter)",
  sky: "var(--color-sky)",
} as const;

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

/** `amount`% of `a`, the rest `b`. Nestable — most pigments below are two or
 *  three mixes deep. */
export function mix(a: string, amount: number, b: string): string {
  return `color-mix(in srgb, ${a} ${clampPct(amount)}%, ${b})`;
}

/** `color` at `alpha`% opacity, as a colour rather than an `opacity` property —
 *  so it can be used for one shape inside a group without fading the group. */
export function veil(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${clampPct(alpha)}%, transparent)`;
}

/* -------------------------------------------------------------------------- */
/* Base pigments                                                              */
/* -------------------------------------------------------------------------- */

/** Grass in the sun. The colour the whole world is keyed to. */
const grass = T.leaf;
/** Grass in shade, and the body of every canopy. */
const grassDeep = mix(T.leafDeep, 88, T.lilac);
/** Grass with the afternoon on it. */
const grassLit = mix(T.butter, 40, T.leaf);
/** What distance turns into: the sky's own colour, not haze. */
const air = mix(T.sky, 46, T.paper);

export const pigment = {
  /* sky ------------------------------------------------------------------ */
  skyZenith: mix(T.sky, 84, T.surface),
  skyMid: mix(T.sky, 44, T.paper),
  skyHorizon: mix(T.warm, 26, mix(T.butter, 34, T.paper)),
  /** The warm phase the sky drifts into: peach going faintly pink, never red. */
  skyEveningHigh: mix(T.butter, 30, mix(T.sky, 40, T.paper)),
  skyEveningLow: mix(T.warm, 46, mix(T.blossom, 30, T.paper)),

  /* light ---------------------------------------------------------------- */
  sunCore: mix(T.surface, 44, T.butter),
  sunGlow: mix(T.butter, 82, T.paper),
  light: mix(T.butter, 66, T.surface),
  ray: mix(T.butter, 58, T.surface),
  /** Tiny highlights: dew, a petal edge, the top of a blade of grass. */
  sparkle: mix(T.surface, 62, T.butter),

  /* clouds --------------------------------------------------------------- */
  cloudBody: mix(T.surface, 92, T.sky),
  cloudLit: mix(T.surface, 62, T.butter),
  /** Cloud undersides are lavender-blue. Grey undersides make a sky look like
   *  weather is coming, which is the wrong afternoon entirely. */
  cloudShade: mix(T.lilac, 46, mix(T.sky, 50, T.surface)),

  /* land ----------------------------------------------------------------- */
  grass,
  grassDeep,
  grassLit,
  air,
  /** Pale, fresh green for the far side of the meadow. */
  grassPale: mix(T.leaf, 56, T.paper),
  /** The universal shade: green going lavender. Used at low alpha, always. */
  shadow: mix(T.leafDeep, 58, T.lilac),

  /* incidentals ---------------------------------------------------------- */
  bark: mix(T.ink, 56, T.warm),
  barkLit: mix(T.warm, 52, mix(T.ink, 50, T.paper)),
  stone: mix(T.inkMuted, 34, T.paper),
  path: mix(T.warm, 30, mix(T.paper, 84, T.inkMuted)),
  wood: mix(T.ink, 52, T.warm),
  water: mix(T.sky, 62, T.surface),
  lantern: mix(T.butter, 88, T.surface),
  blossom: T.blossom,
  lilac: T.lilac,
  butter: T.butter,
} as const;

/**
 * The flowers.
 *
 * Six species rather than one recoloured shape, because a meadow reads as a
 * meadow through *variety of silhouette*, not variety of hue. They are also
 * scattered in drifts rather than evenly (see `flora.ts`), the way seed
 * actually spreads.
 */
export const species = {
  daisy: { petal: mix(T.surface, 94, T.butter), heart: T.butter },
  buttercup: { petal: mix(T.butter, 86, T.warm), heart: mix(T.butter, 60, T.warm) },
  pink: { petal: T.blossom, heart: mix(T.butter, 70, T.blossom) },
  lavender: { petal: T.lilac, heart: mix(T.lilac, 70, T.surface) },
  clover: { petal: mix(T.blossom, 44, T.surface), heart: mix(T.blossom, 66, T.surface) },
  white: { petal: mix(T.surface, 92, T.blossom), heart: mix(T.butter, 74, T.surface) },
} as const;

export type SpeciesName = keyof typeof species;
export const SPECIES_NAMES = Object.keys(species) as SpeciesName[];

/** Wings, drifting petals, and the blossom in the canopies. */
export const petalPigments = [
  T.blossom,
  mix(T.blossom, 52, T.surface),
  mix(T.surface, 88, T.butter),
  T.lilac,
] as const;

/**
 * Aerial perspective, kept cheerful.
 *
 * `depth` 0 is at your feet, 1 is the last low hill. As it rises, the green
 * dissolves into `air` — which is the *sky's* colour, so the far side of the
 * garden reads as bright and full of light rather than as fog. The ramp is also
 * deliberately short: this is a place you could walk across in an afternoon,
 * not a vista, so nothing ever gets more than about two-thirds of the way to
 * the horizon colour.
 */
export function depthPigment(depth: number, warmth = 0): string {
  const base = warmth > 0 ? mix(pigment.grassLit, warmth * 100, grass) : grass;
  return mix(air, depth * 72, base);
}
