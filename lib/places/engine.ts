import { mulberry32 } from "@/lib/ambient/rng";
import { FAVORITE_CATEGORIES, FAVORITE_REGIONS } from "./preferences";
import type { Month, Place, PlaceCategory, TripLength } from "./types";

/**
 * The randomiser behind every discovery surface — Surprise Me, the wheel's
 * "which destination inside this category", Lucky Draw's cards, Weekend
 * Escape, Hidden Gem Mode. One function (`pickPlace`) so every mode shares
 * the same "don't repeat yourself, favour what's unseen, nudge toward the
 * season" logic instead of five subtly different reimplementations.
 *
 * Deliberately **not** seeded like `lib/ambient/rng.ts` — the backdrop is
 * seeded because it renders on the server and has to hydrate identically on
 * the client; every call here happens client-side, after a tap, so genuine
 * `Math.random()` (the default `rng`) is correct and simpler. `Daily Pick`
 * is the one exception with its own seeded function below, because *it*
 * specifically needs to be the same destination for both of you, all day.
 */

export type PickOptions = {
  /** Recently-shown slugs to steer away from — see `journal/queries.ts`'s `getRecentlyShownSlugs`. */
  excludeSlugs?: ReadonlySet<string>;
  category?: PlaceCategory;
  hiddenGemOnly?: boolean;
  tripLength?: TripLength;
  /** 1–12. Boosts places whose `bestMonths` includes it. Defaults to no seasonal boost. */
  month?: Month;
  rng?: () => number;
};

/**
 * A gentle nudge, never a filter — every one of these adds at most a
 * fraction of the base weight, so an unfeatured, out-of-season, unloved
 * category in a faraway region still has a real (just smaller) chance of
 * coming up. See `preferences.ts` for what `FAVORITE_REGIONS`/
 * `FAVORITE_CATEGORIES` actually contain and why they're hand-set rather
 * than inferred.
 */
function weightFor(place: Place, month: Month | undefined): number {
  let weight = 1;
  if (month && place.bestMonths.includes(month)) weight += 0.6;
  if (place.featured) weight += 0.15;
  if (FAVORITE_REGIONS.includes(place.region)) weight += 0.5;
  if (place.category.some((c) => FAVORITE_CATEGORIES.includes(c))) weight += 0.4;
  return weight;
}

/** Weighted pick via cumulative distribution — O(n), fine at this dataset's size. */
function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: () => number): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Picks one place. Returns `null` only if the filters themselves match
 * nothing (e.g. a category with zero places) — never because everything
 * candidate-eligible was "recently shown": that exclusion is soft, and
 * `pickPlace` falls back to the full candidate pool rather than come up empty,
 * per the "avoid showing the same places repeatedly, but never show nothing"
 * requirement.
 */
export function pickPlace(places: readonly Place[], options: PickOptions = {}): Place | null {
  const rng = options.rng ?? Math.random;

  const candidates = places.filter((place) => {
    if (options.category && !place.category.includes(options.category)) return false;
    if (options.hiddenGemOnly && !place.hiddenGem) return false;
    if (options.tripLength && !place.travelTime.includes(options.tripLength)) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  const unseen = options.excludeSlugs
    ? candidates.filter((p) => !options.excludeSlugs!.has(p.slug))
    : candidates;
  const pool = unseen.length > 0 ? unseen : candidates;

  const weights = pool.map((p) => weightFor(p, options.month));
  return weightedPick(pool, weights, rng);
}

/**
 * Several distinct places for Lucky Draw's face-down cards — no repeats
 * within one draw. Deliberately doesn't call `pickPlace` in a loop: that
 * function's "never come back empty" fallback (re-including recently-shown
 * places once the unseen pool runs dry) is exactly right for a single pick,
 * but wrong here — asking for more cards than there are matching places
 * should stop at however many exist, not start silently repeating cards
 * inside one draw.
 */
export function pickManyPlaces(
  places: readonly Place[],
  count: number,
  options: PickOptions = {},
): Place[] {
  const rng = options.rng ?? Math.random;

  const candidates = places.filter((place) => {
    if (options.category && !place.category.includes(options.category)) return false;
    if (options.hiddenGemOnly && !place.hiddenGem) return false;
    if (options.tripLength && !place.travelTime.includes(options.tripLength)) return false;
    return true;
  });

  const unseen = options.excludeSlugs
    ? candidates.filter((p) => !options.excludeSlugs!.has(p.slug))
    : candidates;
  const pool = unseen.length >= count ? unseen : candidates;

  const remaining = [...pool];
  const picked: Place[] = [];
  const draws = Math.min(count, remaining.length);
  for (let i = 0; i < draws; i += 1) {
    const weights = remaining.map((p) => weightFor(p, options.month));
    const chosen = weightedPick(remaining, weights, rng);
    picked.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
  }
  return picked;
}

/** `YYYY-MM-DD` in the app's own "today" — never the browser's raw clock. See `getAppNow()`. */
function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * The same destination for both of you, all day, changing at local midnight
 * — deterministic from the date alone via `mulberry32` (the same seeded RNG
 * `lib/ambient/rng.ts` uses for the backdrop, reused here because the need is
 * identical: same input, same output, every time, on both ends). Not
 * excluded-slug aware on purpose — "everyone receives the same destination"
 * would break if the two of you had different recently-shown history.
 */
export function dailyPick(places: readonly Place[], date: Date): Place | null {
  if (places.length === 0) return null;
  const rng = mulberry32(hashString(isoDay(date)));
  const index = Math.floor(rng() * places.length);
  return places[index];
}
