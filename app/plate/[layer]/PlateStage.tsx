"use client";

import { useEffect, useState } from "react";

import { BigTree } from "@/components/ambient/paint/BigTree";
import { FramingBoughs } from "@/components/ambient/paint/FramingBoughs";
import { FarRange, NearHills } from "@/components/ambient/paint/HillRange";
import { LightRays } from "@/components/ambient/paint/LightRays";
import { PaintFilters } from "@/components/ambient/paint/PaintFilters";
import { SkyLayer, SunGlow } from "@/components/ambient/paint/Sky";
import {
  compositionForViewport,
  DEFAULT_COMPOSITION,
  type Composition,
} from "@/lib/ambient/composition";
import type { PlateId } from "@/lib/ambient/plates";

/**
 * The transparent stage a single depth band is painted on for the bake.
 *
 * Four jobs, and the first three are all about making the screenshot
 * deterministic:
 *
 * 1. **Strip the page back to nothing.** `omitBackground` in Playwright only
 *    produces a transparent PNG if nothing in the document actually paints a
 *    background, and `body` carries `bg-background` cream from the root layout.
 *    Cleared here rather than in `globals.css` so the ordinary app is untouched.
 *
 * 2. **Turn the full painting back on.** The `-lite` brush overrides and the
 *    dropped grain pass in globals.css exist to make the *live* scene affordable
 *    (see the compositing-cost section there). Baking is the one moment where
 *    cost does not matter — it happens once, on a developer's machine, and the
 *    output is pixels. `data-bake` reverts those economies so the plate carries
 *    the two-pass brushwork that phones have never been able to render. The
 *    whole point of the exercise is that the expensive version ships.
 *
 * 3. **Match the scene's geometry exactly.** The band has to land on the same
 *    pixels it occupied inside `StorybookSky`, or the plate will not register
 *    with the live layers still drawn over it. `100vh` rather than the scene's
 *    `100lvh`: they are identical in headless Chromium (no retracting toolbar),
 *    and `vh` is the one that cannot vary with browser chrome.
 *
 * 4. **Pick the composition from the viewport shape.** This is the only place
 *    in the app that ever asks for anything but landscape, and it is what makes
 *    the portrait plates a re-staged painting rather than a stretched one. The
 *    baker sets the viewport *before* it navigates (see `bakeOne`), so by the
 *    time the effect below runs, `innerHeight > innerWidth` is exactly the
 *    question "is this the portrait pass?".
 *
 *    Read after mount rather than during render, deliberately: the first client
 *    render has to match the server's, and the server has no viewport — the
 *    same constraint `Plate` works under for night. It costs the bake nothing,
 *    because the baker already waits out a re-rasterisation for `data-bake`,
 *    which is set in this very same effect.
 *
 * `isolation: isolate` is carried over from the scene root because the sky wash
 * and the sun's falloffs are `mix-blend-mode` layers — without an isolation
 * boundary they would blend against the page instead of against the band, and
 * the baked pixels would not match what the live scene produced.
 *
 * The layer list lives here rather than in `page.tsx` for one reason: the
 * composition is client state, and a server component cannot hand it down. The
 * route keeps the 404 guard, which is the part that has to stay on the server.
 */
function paint(id: PlateId, composition: Composition): React.ReactNode {
  switch (id) {
    case "sky":
      return (
        <>
          <SkyLayer />
          <SunGlow />
        </>
      );
    case "far":
      return <FarRange composition={composition} />;
    case "near":
      return <NearHills composition={composition} />;
    case "tree":
      return (
        <>
          <BigTree composition={composition} />
          <LightRays />
        </>
      );
    case "boughs":
      return <FramingBoughs composition={composition} />;
  }
}

export function PlateStage({ id }: { id: PlateId }) {
  const [composition, setComposition] = useState<Composition>(DEFAULT_COMPOSITION);

  useEffect(() => {
    const root = document.documentElement;
    const previousBackground = document.body.style.background;

    root.setAttribute("data-bake", "true");
    document.body.style.background = "transparent";

    const restage = () =>
      setComposition(compositionForViewport(window.innerWidth, window.innerHeight));
    restage();
    // Only for a human resizing the easel by hand — the baker navigates afresh
    // for every capture, so its viewport is already final when this mounts.
    window.addEventListener("resize", restage);

    return () => {
      window.removeEventListener("resize", restage);
      root.removeAttribute("data-bake");
      document.body.style.background = previousBackground;
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 w-full overflow-hidden"
      style={{ height: "100vh", isolation: "isolate" }}
    >
      <PaintFilters />
      {paint(id, composition)}
    </div>
  );
}
