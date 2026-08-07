import { osmEmbedUrl } from "@/lib/places/maps";
import type { Place } from "@/lib/places/types";

/**
 * The "Interactive Map" requirement, via OpenStreetMap's public embed —
 * no Google Maps Embed API key or billing account needed. Pan/zoom live
 * inside the iframe; "Open in Maps"/"Directions" (see `PlaceRevealCard`/the
 * detail page's action row) are what actually gets someone there.
 */
export function InteractiveMap({ place }: { place: Place }) {
  return (
    <iframe
      title={`Map centred on ${place.name}`}
      src={osmEmbedUrl(place)}
      className="h-72 w-full rounded-2xl border border-border sm:h-96"
      loading="lazy"
    />
  );
}
