/**
 * "How far is this, really" — computed live from an actual coordinate, not
 * assumed from Metro Manila the way most Philippine travel content is
 * written. This couple doesn't share a city: one of you keeps the book from
 * Leyte, the other from Cebu. See the `TripLength` doc comment in
 * `lib/places/types.ts` for why that split matters enough to be its own file
 * instead of a hardcoded band per place.
 */

/**
 * Where "how far" is measured from — Cebu City, not Manila.
 *
 * Hand-set, the same way `CURRENT_SEASON` is in `lib/theme/tokens.ts`: Cebu
 * is the hub with the ferry and flight connections both of you would
 * actually use, roughly two hours by boat from Leyte and the obvious
 * meeting-in-the-middle point for anything in the Visayas or Mindanao. It
 * isn't perfectly equidistant from both of you — nowhere is — it's the real
 * jumping-off point. Change this by hand if where you're both based changes.
 */
export const HOME_BASE = {
  label: "Cebu",
  latitude: 10.3157,
  longitude: 123.8854,
} as const;

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres between two lat/lon points. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export type TripEstimate = {
  distanceKm: number;
  /** A short, honest phrase — never a precise ETA nobody can promise for inter-island travel. */
  label: string;
};

/**
 * Turns raw distance into the kind of estimate you'd actually say out loud —
 * "practically next door" rather than "38km" — banded around how island travel
 * actually works (a short flight or a long ferry queue matters more than the
 * straight-line km once you're off the same island).
 */
export function estimateTrip(place: { latitude: number; longitude: number }): TripEstimate {
  const km = distanceKm(HOME_BASE, place);

  if (km < 60) return { distanceKm: km, label: "practically next door" };
  if (km < 200) return { distanceKm: km, label: "a half-day's travel" };
  if (km < 500) return { distanceKm: km, label: "a short flight, or a long ferry" };
  if (km < 900) return { distanceKm: km, label: "worth the whole first day getting there" };
  return { distanceKm: km, label: "the other end of the country" };
}

export function formatDistanceKm(km: number): string {
  return `${Math.round(km)} km from ${HOME_BASE.label}`;
}
