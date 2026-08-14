/**
 * The two authored stagings of the garden.
 *
 * ## Why this exists
 *
 * The scene is drawn into fixed-`viewBox` SVGs stretched to the viewport with
 * `preserveAspectRatio="none"`. For a long time the plan of record was that
 * baking at a tall viewport would therefore "re-stage" the scene for portrait.
 * It does not — `none` distorts, it does not recompose. Baking the landscape
 * composition at 430x932 stretched every object vertically (the bridge became a
 * tall arch, the bench a tall box, the treeline pulled into spikes) and left
 * roughly 60% of the frame as empty sky, because the horizon sits where the
 * *landscape* composition put it. See the correction at the bottom of
 * `plates.ts` for the full account, including why the two cheap alternatives
 * (`xMidYMid slice`, `object-cover`) trade a squashed picture for an amputated
 * one rather than fixing anything.
 *
 * So there are two compositions, authored separately: their own horizon
 * heights, their own ridge geometry, their own prop placement and scale, their
 * own tree and bough framing, and — the part that makes `preserveAspectRatio`
 * stop mattering — **their own view boxes, whose aspect matches the box they
 * are drawn into**. Once the viewBox aspect matches the element aspect, `none`
 * and `xMidYMid meet` produce the same pixels, and the stretch is gone by
 * construction rather than by a `preserveAspectRatio` value. The attribute is
 * left as `none` on purpose: it is what guarantees the band still fills its box
 * exactly on the phones whose aspect is a percent or two off the one the
 * composition was authored for, and at that size the residual is invisible.
 *
 * ## Where each one is used
 *
 * `landscape` is the default everywhere, and is the composition that shipped
 * before this file existed — unchanged, deliberately, down to the numbers, so
 * that re-baking produces identical landscape plates and any difference in them
 * is a bug rather than a redesign.
 *
 * `portrait` is selected in exactly two places:
 *
 * - `app/plate/[layer]` — the easel the bake photographs, which picks by
 *   viewport aspect so `scripts/bake-plates.ts` gets the portrait composition
 *   for its portrait pass without needing a search param (see that route's own
 *   note on why it stays a plain static segment).
 * - `MeadowLayer`, live — the meadow is the one foreground band deliberately
 *   never baked, because the grass wave is the most alive thing in the frame.
 *   A composition it could only reach through a plate would therefore never
 *   render at all, and the meadow is exactly where a vertical stretch is most
 *   legible: it is made of blades, and a stretched blade is a spindle. See
 *   `useSceneComposition` for how it is selected without a hydration mismatch.
 *
 * Everything else in the scene is either baked (and so gets its composition
 * from the easel) or sized in viewport units and therefore aspect-independent
 * already — `Sky`, `SunGlow`, `LightRays`, `CloudBank`, `NightSky`, `Pollen`.
 *
 * ## Authoring a composition
 *
 * The numbers live next to the generator that reads them rather than being
 * collected here, because that is the only place they are meaningful:
 *
 * | What | Where |
 * |---|---|
 * | Hill view box, ridges, prop placement, the SVG's own box | `HILL_STAGE` in `terrain.ts` |
 * | Meadow view box, rows, how much of everything | `MEADOW_STAGE` in `flora.ts` |
 * | Where the big tree stands and how large it is | `TREE_STAGE` in `paint/BigTree.tsx` |
 * | Where the framing boughs come in from | `BOUGH_STAGE` in `paint/FramingBoughs.tsx` |
 *
 * The last two are Tailwind boxes rather than generated geometry: the tree and
 * the boughs are drawn into aspect-locked containers, so they were never
 * distorted by any of this — only *placed* for a wide frame, which in a tall
 * one put the tree's swing off the side of the screen and left the second bough
 * hidden entirely.
 *
 * The seeds do not change between compositions, and that is deliberate. It is
 * the same garden either way — the same ridges, the same fence, the same tree —
 * looked at from a frame of a different shape. Re-seeding portrait would make
 * it a different place, which is the one thing the scene is not allowed to be.
 */
export type Composition = "landscape" | "portrait";

/**
 * What everything renders as unless a caller explicitly asks for otherwise.
 *
 * Landscape rather than "whatever the viewport is", deliberately: this is the
 * value a server render resolves to, so it cannot depend on a viewport the
 * server has never seen, and it means every layer in the scene keeps behaving
 * exactly as it did for any caller with no opinion.
 */
export const DEFAULT_COMPOSITION: Composition = "landscape";

/**
 * The media query the portrait composition belongs to.
 *
 * Deliberately the same query `Plate` art-directs its two sets of baked plates
 * with. A live layer and the plate behind it have to change composition on
 * exactly the same condition — otherwise the meadow re-stages itself in front
 * of hills that have not, which is the same class of desynchronisation the
 * `data-celebration` note in `Plate` describes, and just as silent.
 */
export const PORTRAIT_QUERY = "(orientation: portrait)";

/** Which composition a viewport of this shape should be staged for. */
export function compositionForViewport(width: number, height: number): Composition {
  return height > width ? "portrait" : "landscape";
}
