import type {
  Audience,
  BudgetBand,
  Difficulty,
  Month,
  PlaceActivity,
  PlaceCategory,
  TripLength,
} from "./types";

/**
 * Every label the atlas shows for a coded value, in one place.
 *
 * These are separate from the codes on purpose: the codes are data (they end
 * up in URLs, in saved filters, in the wheel's seed), the labels are copy, and
 * copy in this book gets rewritten. Changing "Hidden gem" to "Nobody tags it"
 * should not be a schema change.
 *
 * The wording is the book's, not a travel site's — see
 * `docs/agent/codebase-map/experience-direction.md`. "Somewhere to sleep under
 * stars", not "Camping (12)".
 */

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  beach: "Beaches",
  island: "Islands",
  mountain: "Mountains",
  waterfall: "Waterfalls",
  lake: "Lakes",
  river: "Rivers",
  "national-park": "National parks",
  "hidden-gem": "Hidden gems",
  adventure: "Adventure",
  hiking: "Hiking",
  camping: "Camping",
  surfing: "Surfing",
  diving: "Diving",
  historical: "Historical",
  museum: "Museums",
  church: "Churches",
  food: "Food",
  nature: "Nature",
  cave: "Caves",
  "rice-terraces": "Rice terraces",
};

/**
 * Short forms for the wheel's own wedges only — never used anywhere else.
 * Twenty wedges around one circle leaves each one roughly 18° wide; even
 * curved along the rim (see `SpinWheel.tsx`'s `textPath` labels) there is
 * only room for a handful of characters before text starts crowding into
 * the next wedge. `CATEGORY_LABELS`' full forms ("Rice terraces", "National
 * parks") are the right words for a filter chip with a whole row to itself;
 * they are the wrong words for a wedge a few dozen pixels wide.
 */
export const WHEEL_LABELS: Record<PlaceCategory, string> = {
  beach: "Beach",
  island: "Island",
  mountain: "Mountain",
  waterfall: "Waterfall",
  lake: "Lake",
  river: "River",
  "national-park": "Nat'l park",
  "hidden-gem": "Hidden gem",
  adventure: "Adventure",
  hiking: "Hiking",
  camping: "Camping",
  surfing: "Surfing",
  diving: "Diving",
  historical: "History",
  museum: "Museum",
  church: "Church",
  food: "Food",
  nature: "Nature",
  cave: "Caves",
  "rice-terraces": "Terraces",
};

/** Wheel order. Neighbours are deliberately unalike so a spin looks varied. */
export const CATEGORY_ORDER: readonly PlaceCategory[] = [
  "beach",
  "mountain",
  "waterfall",
  "historical",
  "island",
  "cave",
  "food",
  "hiking",
  "diving",
  "rice-terraces",
  "lake",
  "church",
  "surfing",
  "nature",
  "adventure",
  "museum",
  "river",
  "camping",
  "national-park",
  "hidden-gem",
];

export const ACTIVITY_LABELS: Record<PlaceActivity, string> = {
  swimming: "Swimming",
  snorkeling: "Snorkelling",
  diving: "Diving",
  surfing: "Surfing",
  hiking: "Hiking",
  camping: "Camping",
  caving: "Caving",
  kayaking: "Kayaking",
  "island-hopping": "Island hopping",
  photography: "Photographs",
  stargazing: "Stargazing",
  birdwatching: "Birdwatching",
  waterfalls: "Chasing waterfalls",
  "hot-springs": "Hot springs",
  eating: "Eating properly",
  "heritage-walk": "Walking the old streets",
  cycling: "Cycling",
  boating: "Boats",
  sunrise: "Sunrise",
  sunset: "Sunset",
  wildlife: "Wildlife",
  canyoneering: "Canyoneering",
  hammock: "Doing nothing at all",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy going",
  moderate: "Some effort",
  hard: "Hard",
  expedition: "A proper expedition",
};

export const BUDGET_LABELS: Record<BudgetBand, string> = {
  light: "Light on the wallet",
  moderate: "Middling",
  splurge: "A splurge",
};

/** Rough, per person, whole trip — bands, not quotes. See `BudgetBand`. */
export const BUDGET_HINTS: Record<BudgetBand, string> = {
  light: "under about ₱3,000 each",
  moderate: "somewhere around ₱3,000–₱10,000 each",
  splurge: "north of ₱10,000 each",
};

export const TRIP_LENGTH_LABELS: Record<TripLength, string> = {
  "day-trip": "A day trip",
  weekend: "A weekend",
  "long-weekend": "A long weekend",
  "three-day": "Three days",
  "road-trip": "A road trip",
};

/** The Weekend Escape chooser, in the order it's offered. */
export const TRIP_LENGTH_ORDER: readonly TripLength[] = [
  "day-trip",
  "weekend",
  "long-weekend",
  "three-day",
  "road-trip",
];

/**
 * Nationwide, not per-destination — one number that works anywhere in the
 * country, rather than inventing a plausible-looking "local emergency
 * contact" per place that nobody's actually verified still rings. The
 * Department of Tourism's own tourist-assistance line has changed contact
 * methods more than once in recent years (hotline numbers, then a shift
 * toward its Facebook page for reporting), so rather than print a number
 * that may already be stale, the detail page's tips link to the DOT's own
 * official channel directly — see `DOT_TOURIST_ASSISTANCE_URL`.
 */
export const NATIONWIDE_EMERGENCY_NUMBER = { label: "Police / fire / medical, nationwide", number: "911" };

/** The Department of Tourism's own page — the source of truth for its current tourist-assistance contact, not a number frozen at write time. */
export const DOT_TOURIST_ASSISTANCE_URL = "https://www.facebook.com/PhilippineDepartmentofTourism";

export const AUDIENCE_LABELS: Record<Audience, string> = {
  family: "Good with family",
  couple: "Good for two",
  solo: "Fine on your own",
  friends: "Better with a crowd",
  "pet-friendly": "Dogs allowed",
  "step-free": "Step-free in parts",
};

export const MONTH_LABELS: Record<Month, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

export const MONTH_SHORT: Record<Month, string> = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Aug",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dec",
};

/**
 * "Nov–Feb" rather than "Nov, Dec, Jan, Feb", including across the year
 * boundary — the months a place is good in are almost always contiguous, and a
 * list of eight month names is unreadable at caption size.
 *
 * Returns `"All year"` for a full twelve, and falls back to a comma list for
 * the genuinely non-contiguous cases (two separate windows, which happens on
 * the eastern seaboard where the rains and the habagat swap over).
 */
export function formatMonthRange(months: readonly Month[]): string {
  if (months.length === 0) return "Any time";
  if (months.length === 12) return "All year";

  const present = new Set(months);
  // Rotate so a wrap-around window (Nov,Dec,Jan,Feb) starts at its true start.
  let start: Month | null = null;
  for (let m = 1 as number; m <= 12; m += 1) {
    const prev = ((m + 10) % 12) + 1;
    if (present.has(m as Month) && !present.has(prev as Month)) {
      start = m as Month;
      break;
    }
  }
  if (start === null) return "All year";

  const runs: Month[][] = [];
  let current: Month[] = [];
  for (let step = 0; step < 12; step += 1) {
    const m = (((start - 1 + step) % 12) + 1) as Month;
    if (present.has(m)) {
      current.push(m);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);

  return runs
    .map((run) =>
      run.length === 1
        ? MONTH_SHORT[run[0]]
        : `${MONTH_SHORT[run[0]]}–${MONTH_SHORT[run[run.length - 1]]}`,
    )
    .join(", ");
}
