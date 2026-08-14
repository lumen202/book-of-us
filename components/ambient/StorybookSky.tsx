"use client";

import { useRef } from "react";

import { BigTree } from "./paint/BigTree";
import { CloudBank } from "./paint/CloudBank";
import { FramingBoughs } from "./paint/FramingBoughs";
import { GrainOverlay } from "./paint/GrainOverlay";
import { FarRange, NearHills } from "./paint/HillRange";
import { LightRays } from "./paint/LightRays";
import { NightSky } from "./paint/NightSky";
import { MeadowLayer, Petals, Pollen } from "./paint/Meadow";
import { DistantFlock, LivingThings } from "./paint/LivingThings";
import { PaintFilters } from "./paint/PaintFilters";
import { Plate } from "./paint/Plate";
import { SkyLayer, SunGlow } from "./paint/Sky";
import { BAKED_PLATES } from "@/lib/ambient/plate-manifest";
import { PLATES, type PlateId } from "@/lib/ambient/plates";
import { useSceneComposition } from "@/lib/ambient/useComposition";
import { useParallax } from "@/lib/ambient/useParallax";

/**
 * The place the whole book happens in.
 *
 * A fixed, non-interactive backdrop: a warm afternoon in a flower meadow, with
 * a swing hanging from a big tree, a creek with a little bridge over it, a
 * lantern-strung fence, a bench facing the light, and a flower-lined path
 * leaving the bottom of the frame. Blossoming boughs come in from both top
 * corners. Everything is generated — no image assets, no Lottie, nothing to
 * load — and every colour is a `color-mix()` of design tokens, so the seasons
 * re-tint the world for free.
 *
 * ## What this is for, which is the thing to read before changing anything
 *
 * This is not scenery. It is the place two people meet, and every choice in it
 * is made against one test: *would you want to spend an afternoon here with
 * someone you love?* An earlier version of this backdrop was a technically
 * better landscape than this one — eight ridges, miles of aerial perspective, a
 * mountain range — and it was wrong, because scale is not emotionally neutral.
 * A world that recedes forever puts you outside it, and what comes back is awe
 * or loneliness. Both are the wrong feeling for this book.
 *
 * So the rules are: **intimacy over scale, warmth over realism, charm over
 * spectacle.** The hills are low and close. The palette avoids grey, olive and
 * desaturated brown entirely (see `lib/ambient/palette.ts` for why those had to
 * be designed out rather than merely avoided). There is no dark vignette. And
 * the objects — the swing, the bench, the bridge, the unlit lanterns — are all
 * things that imply *use*, because a place someone loves is a place with worn
 * things in it. There are no people and there never will be; the couple is
 * present entirely through what they have left lying around.
 *
 * ## How it is put together
 *
 * `lib/ambient/` generates the geometry (seeded, so it is the same garden every
 * visit and so the server and client agree); `paint/PaintFilters.tsx` supplies
 * the brushes that turn that geometry into brushwork; the layers below assemble
 * it back to front. Read `PaintFilters` first — it explains why none of this
 * looks like SVG.
 *
 * ## The rules this composition has to keep
 *
 * - **The frame is a room.** Boughs close the top corners, the meadow rises at
 *   the left and right edges (`edgeBias` in `flora.ts`), and the middle is left
 *   as open air because that is where the text sits. Foliage in all four
 *   corners, calm in the centre.
 * - **Nothing crosses the reading band quickly.** Clouds take four to nine
 *   minutes; birds are small, rare and stay in the upper sky.
 * - **Nothing loops visibly.** Every duration is coprime-ish with its
 *   neighbours, and anything occasional is scheduled at random intervals in
 *   `useAmbientLife` rather than animated on a cycle.
 * - **The resting state must look finished.** Under `prefers-reduced-motion`
 *   every animation stops dead (see the block at the end of globals.css) and
 *   the parallax hook never attaches. No element may depend on an animation to
 *   reach a sensible position or opacity — each declares its resting transform
 *   and opacity, and the keyframes only ever depart from it.
 *
 * ## The one performance rule
 *
 * Filters are static and rasterised once; only `transform` and `opacity` are
 * ever animated, and never on an ancestor of a filtered group whose *children*
 * move. Animating a filter primitive — a `baseFrequency`, a displacement
 * `scale` — would re-run the whole paint every frame and is the single change
 * most likely to make this expensive. The meadow's node count is the other
 * budget; see the note in `paint/Meadow.tsx`.
 */
export function StorybookSky() {
  const scene = useRef<HTMLDivElement>(null);
  useParallax(scene);
  /*
   * Only the meadow asks for this. Every other band here is either baked — and
   * so had its composition decided at the easel, arriving as two sets of images
   * `Plate` art-directs between — or sized in viewport units and aspect-blind.
   * The meadow is deliberately never baked, so it is the one layer that has to
   * be staged at runtime. See `useSceneComposition`.
   */
  const composition = useSceneComposition();

  return (
    <div
      ref={scene}
      aria-hidden
      className="ambient-scene pointer-events-none fixed left-0 top-0 w-full -z-10 overflow-hidden"
      style={{
        // Every blend mode in the scene has to resolve against the painting,
        // not against the page behind it.
        isolation: "isolate",
        /*
         * `100lvh`, not `inset: 0`. See BUG-003.
         *
         * On Android Chrome the URL toolbar retracts as you scroll down, and
         * the visible area grows by its height — but Chrome does not commit the
         * layout-viewport resize until the touch gesture *ends*. So for the
         * whole time a finger is down, a `position: fixed; inset: 0` element is
         * still sized to the pre-retraction viewport and a toolbar-high strip
         * at the bottom of the screen is simply not covered by the painting.
         * The reader sees flat `--color-background` cream under the meadow, and
         * it stays there until they let go, which is exactly how it was
         * reported.
         *
         * `lvh` is the *large* viewport — the height with browser chrome
         * retracted, which is the largest the visible area ever gets. Sizing to
         * it means the strip the toolbar is about to vacate is already painted
         * before it is exposed. `svh`/`dvh` would both reintroduce the bug,
         * `dvh` by tracking the same deferred resize this is working around.
         *
         * Anchored to `top`, deliberately: the uncovered strip is at the
         * bottom, so the extra height has to hang off the bottom edge to cover
         * it. That does push the meadow down by the toolbar's height while the
         * toolbar is showing — which is fine, because it is identical to where
         * the meadow settles once the toolbar is gone.
         */
        height: "100lvh",
      }}
    >
      <PaintFilters />

      {/* far background */}
      <Band id="sky" priority>
        <SkyLayer />
        <SunGlow />
      </Band>
      {/* Hidden every day but the 5th, by CSS — see the file's own note on why
          it is rendered rather than conditionally mounted. Never baked: the
          stars shimmer and the moon breathes, and it is cheap enough that
          freezing it would buy nothing. */}
      <NightSky />
      <CloudBank />
      <DistantFlock />

      {/* background */}
      <Band id="far">
        <FarRange />
      </Band>

      {/* midground */}
      <Band id="near">
        <NearHills />
      </Band>
      <Band id="tree">
        <BigTree />
        <LightRays />
      </Band>

      {/* foreground */}
      <MeadowLayer composition={composition} />
      <Pollen />
      {/* Blossom coming down off the cherry — in front of the meadow and
          behind the boughs it falls from. */}
      <Petals />
      <Band id="boughs">
        <FramingBoughs />
      </Band>
      <LivingThings />

      {/* the sheet it is all painted on */}
      <GrainOverlay />
    </div>
  );
}

/**
 * A depth band: the baked plate if one has been painted, otherwise the live
 * SVG layers it was painted from.
 *
 * The fallback is the whole reason this indirection exists rather than the
 * plates being wired in directly. `BAKED_PLATES` is generated by
 * `scripts/bake-plates.ts` (see `lib/ambient/plates.ts` for the why), so before
 * the first bake — and on any band deliberately left out of it — the scene is
 * exactly what it was. That makes this change safe to land ahead of the
 * artwork, safe to bisect, and revertible by emptying one array rather than by
 * unpicking the composition.
 *
 * Both arms are equivalent to the reader and to the compositor: the plate
 * carries the same `data-parallax` the SVG layer carried, so the depth ordering
 * in `depth.ts` is untouched either way.
 *
 * `BAKED_PLATES` is a build-time constant, identical on server and client, so
 * the branch cannot produce a hydration mismatch.
 */
function Band({
  id,
  priority = false,
  children,
}: {
  id: PlateId;
  priority?: boolean;
  children: React.ReactNode;
}) {
  if (!BAKED_PLATES.includes(id)) return <>{children}</>;

  const spec = PLATES.find((plate) => plate.id === id);
  if (!spec) return <>{children}</>;

  return <Plate spec={spec} priority={priority} />;
}
