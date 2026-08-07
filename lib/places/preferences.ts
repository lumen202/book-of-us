import type { PlaceCategory } from "./types";

/**
 * Hand-set personalization for *this* couple — same convention as
 * `CURRENT_SEASON` (`lib/theme/tokens.ts`) and `HOME_BASE` (`./trip.ts`):
 * edited by hand when it stops being true, not inferred from usage data
 * this app doesn't collect. `lib/places/engine.ts`'s `weightFor` reads both
 * as gentle nudges on top of the random pick — never a filter. Discovery
 * stays discovery; this just means the two of you see a bit more of what
 * you'd actually pick yourselves, without ever losing the "surprise" part
 * of Surprise Me by only ever showing the same corner of the map.
 */

/**
 * Where home is. One of you is in Leyte, the other's in Cebu for work but
 * from the same region — so Eastern Visayas gets a modest boost across
 * every discovery mode, the same spirit as `HOME_BASE` using Cebu instead
 * of the Manila every other travel site assumes.
 */
export const FAVORITE_REGIONS: readonly string[] = ["Eastern Visayas (Region VIII)"];

/** What tends to win when either of you is asked "where should we go" — currently: your partner's mountains and quiet nature over crowds. */
export const FAVORITE_CATEGORIES: readonly PlaceCategory[] = ["mountain", "nature"];
