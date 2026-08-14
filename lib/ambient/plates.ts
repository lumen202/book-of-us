import { TRAVEL } from "./depth";

/**
 * The baked painting.
 *
 * ## Why this exists
 *
 * `StorybookSky` used to compute the entire painting in the browser, every
 * visit, on every device — around 4,700 lines of generated SVG run through
 * `feTurbulence` displacement filters that cover most of the viewport. That is
 * the most expensive primitive SVG has, and the bill was being paid by deleting
 * art on the devices least able to afford it: the `(pointer: coarse)` block in
 * globals.css thinned the meadow, dropped the pollen, froze the sky and swapped
 * every brush for a cheaper one-pass `-lite` version. Phones — the device this
 * book is actually read on — were getting the least painted version of the
 * painting.
 *
 * None of that turbulence output ever changes. `lib/ambient/rng.ts` is seeded,
 * so it is deliberately the same garden every visit (see `StorybookSky`'s own
 * note on why: the server and client have to agree). `CURRENT_SEASON` is a
 * build-time constant. The scene was being re-derived from scratch, identically,
 * forever, and then thrown away.
 *
 * So it gets painted once, at build time, at *full* fidelity — every brush at
 * two turbulence passes, all three grain passes — and shipped as pixels. The
 * phone decodes a handful of images instead of running the filters, and in
 * exchange it gets more brushwork than the desktop had before.
 *
 * This is also how the films work. A Ghibli background is a finished painting;
 * only the cels move over the top of it. Nothing in the frame re-paints the
 * hills because a butterfly crossed them.
 *
 * ## Why several plates and not one
 *
 * Because parallax is the depth cue, and parallax needs the bands to move at
 * different rates. One flat plate would be one flat distance. Each entry below
 * is a *depth band* — it bakes exactly the layers that share a `TRAVEL` value,
 * and the plate then carries that same `data-parallax` the SVG used to, so the
 * scroll behaviour is bit-for-bit what it was.
 *
 * There is a second reason, and it is the one that matters for smoothness: a
 * CSS/SVG filter establishes a filtered subtree that has to be re-rasterised
 * whenever *anything inside it* changes. The live cels — creatures, pollen,
 * clouds — used to sit inside the same filtered scene as the hills. As plates,
 * the static bands carry no filter at all, so the things that move are no
 * longer inside anything expensive.
 *
 * ## What is deliberately NOT baked
 *
 * Anything that moves, and anything whose motion is the point:
 *
 * - `CloudBank` / `DistantFlock` — cross the sky over minutes.
 * - `MeadowLayer` — the grass wave is the most alive thing in the frame.
 * - `Pollen`, `LivingThings` — butterflies, bees, fireflies, petals.
 * - `NightSky` — the stars shimmer and the moon breathes; it is also cheap
 *   (plain divs, no filters), so there is nothing to win by freezing it.
 * - `GrainOverlay` — has to stay live, and deliberately is *not* baked into the
 *   plates. Two reasons. It is the one texture pulled across *everything*,
 *   cels included, and that unifying job is the whole point of it (see the
 *   component). And the plates are transparent PNGs: a `multiply` or
 *   `soft-light` pass over a band that is mostly alpha has nothing to blend
 *   against, and five stacked plates would each carry their own copy of a
 *   texture that is supposed to be one sheet. What the bake buys the grain is
 *   budget — with the turbulence gone, the fine pass that `(pointer: coarse)`
 *   had to drop can come back on, everywhere.
 *
 * ## The bottom edge
 *
 * Plates are captured at exactly viewport size, so a band translating up under
 * parallax leaves up to `|TRAVEL|` px of transparency at its bottom edge. That
 * strip is meadow in every case — the meadow is the frontmost band, is still
 * live, and is already drawn taller than the viewport for exactly this reason
 * (see the `-bottom` offsets and the note in `depth.ts`). Do not add a baked
 * band in front of the meadow without revisiting this.
 */
export type PlateId = "sky" | "far" | "near" | "tree" | "boughs";

export type PlateSpec = {
  readonly id: PlateId;
  /** Must match the `TRAVEL` value of every layer baked into this plate. */
  readonly travel: number;
  /** Which `paint/` layers this plate stands in for — read by the bake route. */
  readonly layers: readonly string[];
  /** Human note for whoever next wonders why a band is grouped this way. */
  readonly why: string;
};

export const PLATES: readonly PlateSpec[] = [
  {
    id: "sky",
    travel: TRAVEL.sky,
    layers: ["SkyLayer", "SunGlow"],
    why: "The air and the sun that lights it. Barely stirs; it is the far distance.",
  },
  {
    id: "far",
    travel: TRAVEL.rangeFar,
    layers: ["FarRange"],
    why: "The far ridge — aerial perspective's pale end.",
  },
  {
    id: "near",
    travel: TRAVEL.hillsNear,
    layers: ["NearHills"],
    why: "The close hills, the creek, the bridge, the fence and its lanterns.",
  },
  {
    id: "tree",
    travel: TRAVEL.tree,
    layers: ["BigTree", "LightRays"],
    why: "The tree with the swing, and the afternoon light coming past it.",
  },
  {
    id: "boughs",
    travel: TRAVEL.boughs,
    layers: ["FramingBoughs"],
    why: "The blossoming boughs closing the top corners — the frame as a room.",
  },
] as const;

/**
 * Day and night are separate paintings, not a tint.
 *
 * On the 5th the six garden pigments move to a night palette (see the
 * `data-celebration` block in globals.css) and every mix derived from them —
 * sky, hills, aerial perspective, the grass — re-derives together. That is a
 * different painting, so it is a different plate rather than a filter over the
 * day one. `NightSky` still mounts live on top of the night plate.
 */
export type PlateLight = "day" | "night";

/**
 * Portrait, and the mistake to not repeat.
 *
 * This was originally documented as "a different composition, not a crop", on
 * the reasoning that because the paint layers are fixed-`viewBox` and stretched
 * with `preserveAspectRatio="none"`, baking at a tall viewport would re-stage
 * the scene for that aspect. **That is wrong.** `preserveAspectRatio="none"`
 * does not recompose anything — it distorts. Baking at 430x932 stretched every
 * object in the frame vertically: the bridge became a tall arch, the bench a
 * tall box, the fence rails elongated, and the distant treeline pulled into
 * spikes. It also left roughly 60% of the frame as empty sky, because the
 * horizon sits where the landscape composition put it.
 *
 * The real fix is an authored portrait composition — its own horizon height,
 * its own tree placement and scale, its own bough framing, and terrain
 * regenerated for a tall aspect rather than squeezed into one. That means
 * parameterising the geometry in `terrain.ts` / `flora.ts` / the `*_VIEW`
 * constants by composition, and baking each from its own. Until that exists,
 * these portrait plates are known-distorted.
 *
 * Note the trap in the cheap alternatives: switching the bake to
 * `preserveAspectRatio="xMidYMid slice"` removes the distortion but crops the
 * frame instead, and `object-cover` on the plate does the same thing at
 * runtime. Both trade a squashed picture for an amputated one. Neither is a
 * portrait composition.
 *
 * Sizes are CSS pixels; the bake runs at `deviceScaleFactor: 2`, so the
 * portrait plate lands at 860x1864 device pixels.
 */
export type PlateOrientation = "landscape" | "portrait";

export const PLATE_VIEWPORTS: Record<
  PlateOrientation,
  { readonly width: number; readonly height: number }
> = {
  landscape: { width: 1440, height: 900 },
  portrait: { width: 430, height: 932 },
};

/** Where a baked plate lives, relative to `public/`. */
export function platePath(
  id: PlateId,
  light: PlateLight,
  orientation: PlateOrientation,
  ext: "avif" | "webp",
): string {
  return `/plates/${id}-${light}-${orientation}.${ext}`;
}
