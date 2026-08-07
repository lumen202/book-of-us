/**
 * The atlas — somewhere to go, for two people who keep a book together.
 *
 * Read `docs/agent/codebase-map/places.md` before changing anything here. The
 * short version of the shape:
 *
 * - An **editorial seed** (`data/editorial.ts`) is hand-authored: what kind of
 *   place it is, when to go, how hard it is, and one line in the book's own
 *   voice. It never contains facts that go stale.
 * - An **atlas** (`data/atlas.generated.json`) is fetched at build time from
 *   Wikipedia/Wikimedia Commons by `scripts/build-places.ts`: coordinates,
 *   prose, images, and the licence on each image.
 * - `data/index.ts` merges the two into `Place[]`. Nothing else in the app
 *   reads either half directly — everything goes through `lib/places/source.ts`.
 *
 * Two deliberate omissions, both about not inventing things:
 *
 * 1. **No review scores.** `rating` exists because a future reviews provider
 *    would fill it, and it is `null` for every place today. A number here that
 *    nobody actually gave the place is worse than no number.
 * 2. **No named hotels or restaurants.** `nearbyHotels`/`nearbyRestaurants` are
 *    *searches* around the coordinates, not a list of businesses somebody
 *    typed in once and never checked again. See `lib/places/maps.ts`.
 */

/**
 * The twenty kinds of place the compass can land on.
 *
 * This list is the wheel — `lib/places/wheel.ts` builds its segments straight
 * from it — so adding a category adds a segment, and the wheel's geometry
 * re-derives itself. Keep it at a size that can still be read around a circle;
 * past roughly two dozen the labels stop fitting on a phone.
 */
export type PlaceCategory =
  | "beach"
  | "island"
  | "mountain"
  | "waterfall"
  | "lake"
  | "river"
  | "national-park"
  | "hidden-gem"
  | "adventure"
  | "hiking"
  | "camping"
  | "surfing"
  | "diving"
  | "historical"
  | "museum"
  | "church"
  | "food"
  | "nature"
  | "cave"
  | "rice-terraces";

/** What you'd actually *do* there. Drives search, and the detail page's list. */
export type PlaceActivity =
  | "swimming"
  | "snorkeling"
  | "diving"
  | "surfing"
  | "hiking"
  | "camping"
  | "caving"
  | "kayaking"
  | "island-hopping"
  | "photography"
  | "stargazing"
  | "birdwatching"
  | "waterfalls"
  | "hot-springs"
  | "eating"
  | "heritage-walk"
  | "cycling"
  | "boating"
  | "sunrise"
  | "sunset"
  | "wildlife"
  | "canyoneering"
  | "hammock";

/**
 * How long you'd want, editorially — the axis "Weekend Escape" filters on.
 * Deliberately *not* measured from a fixed city: "a day trip" is not a
 * property of a place, it is a property of a place *and where you start
 * from*, and this couple doesn't share a city (see `HOME_BASE` in
 * `lib/places/trip.ts`, set to Cebu — between one partner in Leyte and the
 * other in Cebu — rather than the Manila-centric default nearly every travel
 * site assumes). So this field stays a rough, origin-independent judgment of
 * effort ("you wouldn't want less than a weekend for this"), and the actual
 * "X hours from home" badge is computed live, per viewer, in `trip.ts`.
 */
export type TripLength = "day-trip" | "weekend" | "long-weekend" | "three-day" | "road-trip";

/** How hard it is on the body, not how hard it is to reach. */
export type Difficulty = "easy" | "moderate" | "hard" | "expedition";

/**
 * Roughly what it costs, per person, for the whole trip — bands, not figures.
 * Precise peso amounts written down once and never revisited are a promise the
 * data can't keep; a band survives a year of inflation and still answers the
 * only question anyone is really asking, which is "can we afford this one?"
 */
export type BudgetBand = "light" | "moderate" | "splurge";

/** Who it suits. Answers the "family / couple / solo / pet / step-free" filters. */
export type Audience =
  | "family"
  | "couple"
  | "solo"
  | "friends"
  | "pet-friendly"
  | "step-free";

/**
 * What you pay at the gate, as a band with an optional note, for the same
 * reason `BudgetBand` is a band: fees are set by barangays and LGUs and change
 * without notice. `varies` is not a cop-out — for most islands the honest
 * answer is that there is an environmental fee, a boat fee and sometimes a
 * guide fee, and which of them applies depends on how you arrive.
 */
export type EntranceFee = {
  kind: "none" | "small" | "moderate" | "steep" | "varies";
  note?: string;
};

/** One licensed photograph, with the credit it is licensed on. */
export type PlaceImage = {
  /** Full-size original, on `upload.wikimedia.org`. Resized by `lib/places/images.ts`. */
  url: string;
  width: number;
  height: number;
  alt: string;
  /** Commons file title, e.g. `File:Kalanggaman Island.jpg` — the stable identifier. */
  file: string;
  credit: {
    artist: string | null;
    license: string | null;
    licenseUrl: string | null;
    /** The Commons file page. Attribution links here, never at the raw image. */
    sourceUrl: string;
  };
  /**
   * A 16px-wide JPEG of the same photo, inlined. Heroes only — see
   * `scripts/build-places.ts` for the size budget, and `PlaceImageFrame` for
   * the blur-up it drives.
   */
  blurDataUrl?: string;
};

/** Months are 1–12. `bestMonths` is when to go; everything else is a filter. */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * The editorial half — hand-authored, checked in, and the only half a human
 * ever edits. Deliberately holds nothing that a build script could fetch, and
 * nothing that goes stale faster than a year.
 */
export type PlaceSeed = {
  slug: string;
  name: string;
  /** The en.wikipedia article `scripts/build-places.ts` pulls facts from. */
  wikipedia: string;
  province: string;
  region: string;
  city: string | null;
  category: readonly PlaceCategory[];
  activities: readonly PlaceActivity[];
  tags: readonly string[];
  bestMonths: readonly Month[];
  budget: BudgetBand;
  difficulty: Difficulty;
  /** From Metro Manila. See `TripLength`. */
  travelTime: readonly TripLength[];
  entranceFee: EntranceFee;
  audience: readonly Audience[];
  /** Lesser-known — the whole content of "Hidden Gem Mode". */
  hiddenGem: boolean;
  /** Hand-picked for the front of the book. Weighted up, never exclusively shown. */
  featured: boolean;
  /**
   * One line in the book's voice — the reason *this* place is in *this* book,
   * not a summary of the Wikipedia article underneath it. This is the field
   * that keeps the atlas from reading like a directory; if it is ever
   * auto-generated the feature has lost its point.
   */
  note: string;
  /** Practical, non-perishable. Two or three at most. */
  tips: readonly string[];
  /** Only when there is a real, official one. No affiliate links, ever. */
  officialWebsite?: string;
  /**
   * Overrides for the build script when an article's own lead image is wrong
   * or missing — Commons file titles, in preference order.
   */
  imageOverride?: readonly string[];
};

/** The fetched half. One entry per seed, keyed by slug. */
export type PlaceAtlasEntry = {
  latitude: number;
  longitude: number;
  /** Plain-text intro from the Wikipedia article. */
  description: string;
  /** The article's History section, if it has one. `null` is normal and fine. */
  history: string | null;
  wikipediaUrl: string;
  heroImage: PlaceImage;
  gallery: readonly PlaceImage[];
  /** ISO date the atlas was last built. */
  fetchedAt: string;
};

/** Seed ⋈ atlas. What every consumer in the app actually sees. */
export type Place = Omit<PlaceSeed, "wikipedia" | "imageOverride"> &
  Omit<PlaceAtlasEntry, "fetchedAt"> & {
    id: string;
    /** True once a person has checked the entry against the real place. */
    verified: boolean;
    /**
     * Deliberately `null` everywhere. See the header comment — the field is
     * the shape a reviews provider would fill, not a number we made up.
     */
    rating: number | null;
    lastUpdated: string;
  };

/**
 * The projection lists render. Everything a card needs and nothing it doesn't
 * — no `description`, no `history`, no gallery. Browse pages hold a hundred of
 * these at once and the two prose fields are ~90% of a `Place`'s weight.
 */
export type PlaceSummary = Pick<
  Place,
  | "id"
  | "slug"
  | "name"
  | "province"
  | "region"
  | "category"
  | "budget"
  | "difficulty"
  | "travelTime"
  | "bestMonths"
  | "hiddenGem"
  | "featured"
  | "note"
  | "latitude"
  | "longitude"
> & { heroImage: PlaceImage };

export function toSummary(place: Place): PlaceSummary {
  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    province: place.province,
    region: place.region,
    category: place.category,
    budget: place.budget,
    difficulty: place.difficulty,
    travelTime: place.travelTime,
    bestMonths: place.bestMonths,
    hiddenGem: place.hiddenGem,
    featured: place.featured,
    note: place.note,
    latitude: place.latitude,
    longitude: place.longitude,
    heroImage: place.heroImage,
  };
}
