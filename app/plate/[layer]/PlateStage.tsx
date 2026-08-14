"use client";

import { useEffect } from "react";

import { PaintFilters } from "@/components/ambient/paint/PaintFilters";

/**
 * The transparent stage a single depth band is painted on for the bake.
 *
 * Three jobs, all of them about making the screenshot deterministic:
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
 * `isolation: isolate` is carried over from the scene root because the sky wash
 * and the sun's falloffs are `mix-blend-mode` layers — without an isolation
 * boundary they would blend against the page instead of against the band, and
 * the baked pixels would not match what the live scene produced.
 */
export function PlateStage({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const previousBackground = document.body.style.background;

    root.setAttribute("data-bake", "true");
    document.body.style.background = "transparent";

    return () => {
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
      {children}
    </div>
  );
}
