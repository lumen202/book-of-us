/**
 * Paints the static half of the ambient scene once, so the reader's phone
 * never has to.
 *
 * Screenshots each depth band from `app/plate/[layer]` on a transparent
 * background, in day and night, landscape and portrait, and writes AVIF + WebP
 * into `public/plates/`. Read `lib/ambient/plates.ts` first — it explains what
 * a plate is, why the scene is cut into bands rather than flattened into one
 * image, and what is deliberately left live.
 *
 * Requires a dev server already running (the easel route is development-only by
 * design). Run with:
 *
 *   npm run dev
 *   npm run bake:plates
 *
 * Re-run it whenever the painting changes: any edit under
 * `components/ambient/paint/`, `lib/ambient/`, or the garden pigments in
 * `app/globals.css`. Nothing checks this for you — the plates are committed
 * build output, and a stale plate looks exactly like a correct one.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "playwright";
import sharp from "sharp";

import {
  PLATES,
  PLATE_VIEWPORTS,
  type PlateLight,
  type PlateOrientation,
} from "../lib/ambient/plates";

const BASE_URL = process.env.BAKE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "public", "plates");

/**
 * Device pixel ratio to bake at.
 *
 * 2 rather than 3: the plates are watercolour — soft gradients, blurred brush
 * edges, no hard type or hairlines — so the ~2.25x pixel count that 3x costs
 * buys almost nothing visible, and these are full-viewport images a phone has
 * to decode before it can show the page. AVIF at 2x is still sharper than the
 * live SVG ever managed there, because the live version was running the cheap
 * one-pass brushes.
 */
const SCALE = 2;

const LIGHTS: readonly PlateLight[] = ["day", "night"];
const ORIENTATIONS: readonly PlateOrientation[] = ["landscape", "portrait"];

/**
 * Waits until the band has actually finished painting.
 *
 * Neither of the two things that matter here is covered by `networkidle`. The
 * SVG filters rasterise asynchronously after layout, and — more importantly —
 * `PlateStage` sets `data-bake` in an effect, so the full-quality brush filters
 * only attach after hydration and trigger a re-rasterisation. Shooting before
 * that lands would bake the cheap `-lite` brushwork into the plates, which is
 * the exact thing this whole pipeline exists to escape, and it would look
 * plausible rather than broken.
 *
 * A double `requestAnimationFrame` after `document.fonts.ready` puts us a full
 * composited frame past the point where filter output exists; the fixed settle
 * on top covers the post-hydration re-raster.
 */
async function waitForPaint(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(600);
}

async function bakeOne(
  page: Page,
  layer: string,
  light: PlateLight,
  orientation: PlateOrientation,
): Promise<void> {
  const viewport = PLATE_VIEWPORTS[orientation];
  await page.setViewportSize(viewport);
  await page.goto(`${BASE_URL}/plate/${layer}`, { waitUntil: "networkidle" });

  /*
   * Hide the Next.js dev-tools badge.
   *
   * The easel only runs under `npm run dev`, so the dev overlay is always on
   * screen — and it rendered straight into the first bake as a black disc in
   * the corner of the boughs plate. It is injected into a `<nextjs-portal>`
   * custom element outside the React tree, so nothing in the route can hide it
   * and it has to be suppressed here, per capture.
   *
   * Worth knowing what this class of bug looks like: the badge is small, sits in
   * a corner, and survives into a *transparent* PNG, so it is invisible in a
   * file listing, invisible in the byte size, and only shows up once the bands
   * are composited over each other. Any future dev-only chrome (an error
   * overlay, a route announcer) has the same shape.
   */
  await page.addStyleTag({
    content: "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }",
  });

  /*
   * Night is a different painting, not a tint — the six garden pigments move
   * and every mix derived from them re-derives together (see the
   * `data-celebration` block in globals.css). Set from here rather than passed
   * as a query param so the easel route needs no search params and stays a
   * plain static segment.
   */
  await page.evaluate((isNight) => {
    const root = document.documentElement;
    if (isNight) root.setAttribute("data-celebration", "true");
    else root.removeAttribute("data-celebration");
  }, light === "night");

  await waitForPaint(page);

  /*
   * `omitBackground` gives the transparent PNG the bands need in order to
   * stack.
   *
   * Deliberately NOT `fullPage: true`. Full-page capture resizes the viewport
   * to the document height before shooting, which breaks every fixed-position
   * element sized in viewport units — and this entire stage is exactly that, so
   * a full-page shot would capture the band covering only the top slice of an
   * artificially tall image. The stage is already viewport-sized; a default
   * viewport-bounded capture is the correct one.
   */
  const png = await page.screenshot({ type: "png", omitBackground: true });

  const base = `${layer}-${light}-${orientation}`;
  const source = sharp(png);

  /*
   * Alpha fidelity matters more than colour fidelity here: these are
   * soft-edged cutouts stacked on one another, and a coarsely quantised alpha
   * channel shows up as a hard rim along a brush edge — the one artefact that
   * would read as "assembled from images" rather than "painted".
   */
  await Promise.all([
    source.clone().avif({ quality: 62, effort: 6 }).toFile(path.join(OUT_DIR, `${base}.avif`)),
    source
      .clone()
      .webp({ quality: 82, alphaQuality: 100, effort: 6 })
      .toFile(path.join(OUT_DIR, `${base}.webp`)),
  ]);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: SCALE,
    /*
     * The plates are a still painting. Baking with motion reduced removes any
     * chance of catching a band mid-drift, and every layer declares its resting
     * transform and opacity explicitly (the "resting state must look finished"
     * rule in StorybookSky), so this is the intended frame rather than a
     * degraded one.
     */
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  let count = 0;
  for (const plate of PLATES) {
    for (const light of LIGHTS) {
      for (const orientation of ORIENTATIONS) {
        await bakeOne(page, plate.id, light, orientation);
        count += 1;
        console.log(`  baked ${plate.id}-${light}-${orientation}`);
      }
    }
  }

  await browser.close();

  /*
   * A generated manifest, so the runtime never has to guess whether a plate
   * exists. `StorybookSky` renders the live SVG band for any id not listed
   * here, which is what makes this whole change safe to land before the first
   * bake has been run and safe to revert by emptying one array.
   *
   * A `.ts` module rather than JSON in `public/`: it is typed, it is bundled
   * rather than fetched, and the alternative — probing with `fetch` at runtime —
   * would be a request per band on every visit, which is the opposite of the
   * point. Generated rather than hand-maintained so it cannot drift from what
   * is actually on disk.
   */
  await writeFile(
    path.join(process.cwd(), "lib", "ambient", "plate-manifest.ts"),
    [
      "// Generated by scripts/bake-plates.ts — do not edit by hand.",
      "// Lists the depth bands that have baked plates in public/plates/.",
      "// An id absent from this array falls back to its live SVG layer.",
      'import type { PlateId } from "./plates";',
      "",
      `export const BAKED_PLATES: readonly PlateId[] = ${JSON.stringify(
        PLATES.map((plate) => plate.id),
      )};`,
      "",
      `export const PLATE_SCALE = ${SCALE};`,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`\nBaked ${count} plates into public/plates/.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
