"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_COMPOSITION, PORTRAIT_QUERY, type Composition } from "./composition";

/**
 * Which composition the live scene should stage itself in.
 *
 * ## Who needs this, and who does not
 *
 * Almost nothing. Every band that gets *baked* takes its composition from the
 * easel at build time and arrives as a pair of images that `Plate` art-directs
 * between on this same media query — no runtime question to ask. Everything
 * sized in viewport units (`Sky`, `SunGlow`, `LightRays`, `CloudBank`,
 * `NightSky`, `Pollen`) has no composition at all.
 *
 * That leaves the meadow, which is deliberately never baked because the grass
 * wave is the most alive thing in the frame — so it is the one layer whose
 * portrait composition can only be reached at runtime. It is also the layer
 * where the stretch was most legible: a meadow is made of blades, and a blade
 * stretched 1.56x vertically is a spindle.
 *
 * ## The hydration constraint, and the one artefact it leaves
 *
 * The server has no viewport, so the server snapshot is the landscape default
 * and the first client render must agree with it — the same constraint `Plate`
 * works under for night, and `PlateStage` for the bake. On a phone that means
 * the meadow paints landscape once and re-stages to portrait immediately after
 * hydration.
 *
 * That re-render is real and worth naming rather than hiding: it is one pass
 * over the meadow's ~590 nodes, during load, behind the page's own content, on
 * the *backdrop*. It replaces a permanently stretched foreground, which is the
 * trade being made. It is not a spinner-adjacent flash of missing scenery —
 * there is a finished meadow on screen at every moment, and the two stagings
 * differ in the shape of the blades rather than in whether there are any.
 *
 * `useSyncExternalStore` rather than an effect and `useState` so that the value
 * is subscribed rather than sampled: a phone rotated from portrait to landscape
 * mid-read re-stages the meadow to match the plates behind it, which switch on
 * the identical query at the same instant.
 */
function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(PORTRAIT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function read(): Composition {
  return window.matchMedia(PORTRAIT_QUERY).matches ? "portrait" : "landscape";
}

export function useSceneComposition(): Composition {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_COMPOSITION);
}
