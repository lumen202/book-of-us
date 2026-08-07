import { PLACES } from "./data";
import type {
  Audience,
  BudgetBand,
  Difficulty,
  Month,
  Place,
  PlaceActivity,
  PlaceCategory,
  TripLength,
} from "./types";

/**
 * The one door into the atlas. Nothing else in the app imports `./data`
 * directly — see the header comment on `types.ts` for why the seed/atlas
 * split exists, and the "Data Source Strategy" note in
 * `docs/agent/codebase-map/places.md` for what swapping this file for a real
 * backend (Supabase table, CMS, API) would look like: every function below
 * keeps its exact signature, only the body inside this file changes. Nothing
 * downstream — the recommendation engine, the wheel, any page — would need
 * to know the difference.
 */

export function getAllPlaces(): readonly Place[] {
  return PLACES;
}

export function getPlaceBySlug(slug: string): Place | null {
  return PLACES.find((p) => p.slug === slug) ?? null;
}

export function getPlacesBySlugs(slugs: readonly string[]): Place[] {
  const set = new Set(slugs);
  return PLACES.filter((p) => set.has(p.slug));
}

export type PlaceFilters = {
  query?: string;
  category?: readonly PlaceCategory[];
  province?: string;
  region?: string;
  budget?: readonly BudgetBand[];
  difficulty?: readonly Difficulty[];
  travelTime?: readonly TripLength[];
  activities?: readonly PlaceActivity[];
  audience?: readonly Audience[];
  hiddenGemOnly?: boolean;
  month?: Month;
};

function matchesQuery(place: Place, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    place.name.toLowerCase().includes(q) ||
    place.province.toLowerCase().includes(q) ||
    place.region.toLowerCase().includes(q) ||
    (place.city?.toLowerCase().includes(q) ?? false) ||
    place.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    place.category.some((c) => c.includes(q))
  );
}

/**
 * The one filter/search function — search page and every discovery mode's
 * "within this category" / "within this trip length" narrowing both go
 * through this, so there is exactly one place that defines what "matches" means.
 */
export function searchPlaces(filters: PlaceFilters): Place[] {
  return PLACES.filter((place) => {
    if (filters.query && !matchesQuery(place, filters.query)) return false;
    if (filters.category && filters.category.length > 0) {
      if (!filters.category.some((c) => place.category.includes(c))) return false;
    }
    if (filters.province && place.province !== filters.province) return false;
    if (filters.region && place.region !== filters.region) return false;
    if (filters.budget && filters.budget.length > 0 && !filters.budget.includes(place.budget)) {
      return false;
    }
    if (
      filters.difficulty &&
      filters.difficulty.length > 0 &&
      !filters.difficulty.includes(place.difficulty)
    ) {
      return false;
    }
    if (filters.travelTime && filters.travelTime.length > 0) {
      if (!filters.travelTime.some((t) => place.travelTime.includes(t))) return false;
    }
    if (filters.activities && filters.activities.length > 0) {
      if (!filters.activities.some((a) => place.activities.includes(a))) return false;
    }
    if (filters.audience && filters.audience.length > 0) {
      if (!filters.audience.some((a) => place.audience.includes(a))) return false;
    }
    if (filters.hiddenGemOnly && !place.hiddenGem) return false;
    if (filters.month && !place.bestMonths.includes(filters.month)) return false;
    return true;
  });
}

export function getProvinces(): string[] {
  return Array.from(new Set(PLACES.map((p) => p.province))).sort();
}

export function getRegions(): string[] {
  return Array.from(new Set(PLACES.map((p) => p.region))).sort();
}

/** Places sharing at least one category or the same province — the detail page's "nearby / similar" rail. */
export function getRelatedPlaces(place: Place, limit = 6): Place[] {
  const scored = PLACES.filter((p) => p.id !== place.id).map((p) => {
    let score = 0;
    if (p.province === place.province) score += 3;
    if (p.region === place.region) score += 1;
    score += p.category.filter((c) => place.category.includes(c)).length * 2;
    return { place: p, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.place);
}
