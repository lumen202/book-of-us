import atlasJson from "./atlas.generated.json";
import { EDITORIAL_SEEDS } from "./editorial";
import type { Place, PlaceAtlasEntry } from "../types";

const atlas = atlasJson as unknown as Record<string, PlaceAtlasEntry>;

/**
 * Seed ⋈ atlas, built once at module load. This is the one place the two
 * halves of the data model are joined — everything else in `lib/places/`
 * imports `PLACES` from `lib/places/source.ts`, never these two files
 * directly, so the join point never has to be reasoned about twice.
 *
 * A seed with no atlas entry is dropped (with a console warning, not a
 * throw) rather than crashing every page in the feature over one missing
 * fetch — `scripts/build-places.ts` is the place that enforces completeness,
 * at build time, where a missing entry is loud and blocks a commit rather
 * than 500ing a visitor.
 */
function buildPlaces(): Place[] {
  const places: Place[] = [];
  for (const seed of EDITORIAL_SEEDS) {
    const entry = atlas[seed.slug];
    if (!entry) {
      console.warn(`[places] "${seed.slug}" has no atlas entry — run scripts/build-places.ts`);
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- deliberately dropping the seed-only source fields from the merged Place
    const { wikipedia, wikidata, commonsCategory, descriptionSection, imageOverride, ...seedRest } = seed;
    const { fetchedAt, ...entryRest } = entry;
    places.push({
      ...seedRest,
      ...entryRest,
      id: seed.slug,
      verified: true,
      rating: null,
      lastUpdated: fetchedAt,
    });
  }
  return places;
}

export const PLACES: readonly Place[] = buildPlaces();
