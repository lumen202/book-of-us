import type { Place } from "./types";

/**
 * Every map/directions/"what's nearby" link a destination needs, built from
 * its coordinates — no API key, no billing account, just Google Maps' public
 * URL scheme. See the header comment on `types.ts` for why there are no
 * named hotels/restaurants: a *search* around real coordinates stays
 * correct forever, a hand-typed business name and phone number goes stale
 * the first time that restaurant closes.
 */

export function googleMapsUrl(place: Place): string {
  return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
}

/** Turn-by-turn from wherever the visitor already is — Google resolves the origin client-side. */
export function directionsUrl(place: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
}

function nearbySearchUrl(place: Place, query: string): string {
  const q = encodeURIComponent(query);
  return `https://www.google.com/maps/search/${q}/@${place.latitude},${place.longitude},13z`;
}

export function nearbyHotelsUrl(place: Place): string {
  return nearbySearchUrl(place, "hotels near me");
}

export function nearbyRestaurantsUrl(place: Place): string {
  return nearbySearchUrl(place, "restaurants near me");
}

/**
 * "Check current deals" — a plain Google web search for tour packages and
 * flight/ferry promos to this place, scoped by name and province.
 *
 * Deliberately not a hand-built link into Klook/Traveloka/Skyscanner's own
 * search: those sites' query-string formats aren't publicly documented and
 * change without notice, and a guessed-at parameter shape risks landing on
 * a 404 or a generic homepage instead of an actual search — exactly the
 * "no broken links" requirement this feature is built around. A web search
 * surfaces whichever agencies are actually running a promo *right now*
 * (Klook, Traveloka, an airline's own site, a local operator) rather than
 * betting on one, and needs no maintenance if any of them changes.
 */
export function dealsSearchUrl(place: Place): string {
  const q = encodeURIComponent(`${place.name} ${place.province} Philippines tour package deals flight promo`);
  return `https://www.google.com/search?q=${q}`;
}

/** A `geo:` URI — the one link that opens a phone's own installed maps app instead of a browser tab. */
export function geoUri(place: Place): string {
  return `geo:${place.latitude},${place.longitude}?q=${place.latitude},${place.longitude}(${encodeURIComponent(place.name)})`;
}

/**
 * An embeddable OpenStreetMap iframe — the "Interactive Map" requirement,
 * without a Google Maps Embed API key/billing account. `deltaDeg` sizes the
 * viewbox around the point; ~0.03° is roughly a 3km box, wide enough to show
 * an island or a falls in its surroundings without zooming out to the whole
 * province.
 */
export function osmEmbedUrl(place: Place, deltaDeg = 0.03): string {
  const west = place.longitude - deltaDeg;
  const south = place.latitude - deltaDeg;
  const east = place.longitude + deltaDeg;
  const north = place.latitude + deltaDeg;
  const bbox = `${west},${south},${east},${north}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${place.latitude},${place.longitude}&layer=mapnik`;
}
