import type { PlaceImage } from "./types";

/**
 * The provider-swap seam for images — see "Data Source Strategy" and "Image
 * Requirements" in `docs/agent/codebase-map/places.md`. Every `PlaceImage`
 * already carries a Wikimedia Commons thumbnail (capped at 1600px wide by
 * `scripts/build-places.ts`) plus its own width/height, which is what
 * `next/image` needs to reserve layout space with no CLS — most call sites
 * should just pass `place.heroImage` straight into an `<Image>` with `fill`
 * or explicit `width`/`height` and let Next's own Image Optimization API
 * handle responsive sizing (see `next.config.ts`'s `images.remotePatterns`).
 *
 * `resizedCommonsUrl` exists for the handful of places that render *outside*
 * `next/image` — a share-card `<canvas>` draw, an Open Graph image, the
 * wheel's tiny per-segment thumbnail — where a specific pixel width is
 * wanted without going through the optimizer.
 */
export function resizedCommonsUrl(image: PlaceImage, width: number): string {
  // Commons thumb URLs look like
  // .../commons/thumb/e/ea/File_name.jpg/1920px-File_name.jpg — the trailing
  // segment is "{width}px-{filename}". Swapping just that segment re-requests
  // the same source render at a different width; Commons generates and
  // caches it on first request.
  const match = image.url.match(/^(.*\/thumb\/.+\/)(\d+)px-([^/]+)$/);
  if (!match) return image.url;
  const [, base, , filename] = match;
  return `${base}${Math.max(1, Math.round(width))}px-${filename}`;
}

/** `sizes` attribute for a full-bleed hero — phones get the viewport, larger screens cap at the card's max width. */
export const HERO_SIZES = "(max-width: 768px) 100vw, 960px";

/** `sizes` for a grid card — roughly a third of the viewport on desktop, half on tablet, full on phone. */
export const CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
