/**
 * Builds `lib/places/data/atlas.generated.json` from `lib/places/data/editorial.ts`.
 *
 * Run with `npx tsx scripts/build-places.ts`. Not part of `next build` — the
 * atlas is checked in like any other content file, and rebuilding it is a
 * deliberate act (an editor added a place, or wants fresher prose/images),
 * not something that should silently re-fetch Wikipedia on every deploy. See
 * `docs/agent/codebase-map/places.md`.
 *
 * A seed is sourced one of two ways, and both end in the same shape:
 *
 *   - **`wikipedia`** — the default. Coordinates, prose and photos all come
 *     from one article. Point it at the *destination*, not the town around it:
 *     `Tumalog Falls`, not `Oslob`.
 *   - **`wikidata` + `commonsCategory`** — for the places English Wikipedia
 *     simply has no article for. Osmeña Peak, Sambawan Island, Simala Shrine
 *     and Bantayan Island are all in that set, and all four are among the
 *     most-visited places in the two provinces this book is written from.
 *     These entries get coordinates and photographs but no `description`; the
 *     detail page falls back to the seed's editorial note.
 *
 * For every `PlaceSeed.wikipedia` title, this pulls from the public MediaWiki
 * API — no key required, but a descriptive `User-Agent` is: Wikimedia blocks
 * anonymous-looking bot traffic:
 *
 *   1. Coordinates (`prop=coordinates`)
 *   2. Plain-text extract, whole article with wiki-style section markers
 *      (`prop=extracts&explaintext=1&exsectionformat=wiki`), split locally
 *      into "intro" (everything before the first `==`) and every named
 *      section — "History" becomes the detail page's history block, and
 *      "Tourism" becomes the description for area articles whose intro is a
 *      census stub (see `looksLikeAreaArticle`).
 *   3. The canonical article URL (`prop=info&inprop=url`)
 *   4. Every image linked from the article (`prop=images`), filtered to
 *      photographs (drops flags/logos/locator-maps/icons by filename and
 *      extension), then `imageinfo` on the Commons survivors for a real URL,
 *      dimensions and `extmetadata` (artist, licence) — landscape and at
 *      least 1024px wide preferred for the hero, the rest become gallery.
 *
 * A seed's `imageOverride` (Commons file titles) replaces step 4's ranking
 * for that entry when the article's own images are wrong or absent.
 *
 * Every entry is required to end up with coordinates and a hero image with a
 * usable licence — the "do NOT use placeholder images / broken links"
 * requirement from the feature brief means a missing one fails the whole
 * build rather than shipping a broken card. Extend `EDITORIAL_SEEDS` only
 * with titles you've confirmed have both (the API request is cheap; check
 * before writing a seed row).
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { EDITORIAL_SEEDS } from "../lib/places/data/editorial";
import type { PlaceAtlasEntry, PlaceImage } from "../lib/places/types";

const USER_AGENT =
  "BookOfUsPlacesBuilder/1.0 (private relationship archive; contact via repo owner; https://github.com)";
const OUT_PATH = path.join(__dirname, "..", "lib", "places", "data", "atlas.generated.json");

const BAD_FILENAME = /\b(flag|logo|locator|icon|pfeil|arrow|red_pog|red pog|wikivoyage|commons-logo|position_map|location_map|blank_map|disambig)\b/i;
const IMAGE_EXT = /\.(jpe?g|png)$/i;

type Json = Record<string, unknown>;

async function mwApi(host: string, params: Record<string, string>): Promise<Json> {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({ format: "json", ...params }).toString();

  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
      if (!res.ok) throw new Error(`${host} ${res.status} for ${url.pathname}${url.search}`);
      return (await res.json()) as Json;
    } catch (caught) {
      lastError = caught;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw lastError;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type Extract = {
  intro: string;
  /** Section body by lower-cased section title, e.g. `"history"`, `"tourism"`. */
  sections: Map<string, string>;
};

/** Splits a `exsectionformat=wiki` extract into intro text and its named sections. */
function splitSections(extract: string): Extract {
  const headerRe = /^={2,}\s*(.+?)\s*={2,}$/gm;
  const marks: { title: string; index: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headerRe.exec(extract))) {
    marks.push({ title: match[1], index: match.index, end: match.index + match[0].length });
  }

  const intro = (marks.length > 0 ? extract.slice(0, marks[0].index) : extract).trim();
  const sections = new Map<string, string>();

  for (let i = 0; i < marks.length; i += 1) {
    // A section's body runs until the next header AT THE SAME OR SHALLOWER
    // depth (fewer or equal '='), not just the very next header — otherwise a
    // "=== Pre-Colonial Era ===" subsection under "== History ==" would look
    // like the end of History instead of part of it.
    const depth = extract.slice(marks[i].index).match(/^=+/)?.[0].length ?? 2;
    let end = extract.length;
    for (let j = i + 1; j < marks.length; j += 1) {
      const next = extract.slice(marks[j].index).match(/^=+/)?.[0].length ?? 2;
      if (next <= depth) {
        end = marks[j].index;
        break;
      }
    }
    // A section body still carries its own subsection markers — Camiguin's
    // "Natural attractions" opens with a literal "=== Volcanoes ===" line.
    // Keep the subsection *titles* (they read as headings in the prose block)
    // and drop the `=` fencing, which only ever looked like markup on a card.
    const body = extract
      .slice(marks[i].end, end)
      .replace(/^={2,}\s*(.+?)\s*={2,}$/gm, "$1")
      .trim();
    const key = marks[i].title.toLowerCase();
    // First occurrence wins — an article with both "== History ==" and a
    // "=== History ===" under some other heading should use the top-level one.
    if (body.length > 0 && !sections.has(key)) sections.set(key, body);
  }

  return { intro, sections };
}

/**
 * Does this article's intro read as an *area* rather than a destination?
 *
 * Every Philippine municipality, city and province has a bot-maintained
 * en.wikipedia article whose intro is a census stub — "Oslob, officially the
 * Municipality of Oslob […] is a municipality in the province of Cebu.
 * According to the 2024 census, it has a population of 29,378 people." Printed
 * on a reveal card under a photograph of a whale shark, that is a population
 * figure where the reason to go should be. When the article has a Tourism
 * section, that section is what a reader actually came for, so `describe()`
 * prefers it.
 *
 * Seeds should still point at the destination itself wherever an article for
 * it exists (`Tumalog Falls`, not `Oslob`) — this is the graceful degradation
 * for when one doesn't, not a licence to seed municipalities.
 */
function looksLikeAreaArticle(intro: string): boolean {
  const firstSentence = intro.split(/(?<=\.)\s/)[0] ?? intro;
  return /\bis (?:a|an|the)\b[^.]*\b(?:municipality|component city|highly urbanized city|independent component city|island province|province|island municipality|barangay|city)\b/i.test(
    firstSentence,
  );
}

/**
 * Section titles that mean "the part a traveller came for", in preference
 * order. Philippine LGU articles are not consistent about which one they use —
 * Moalboal has "Tourism", Oslob has "Tourist attractions", Biliran has "Points
 * of interest", Camiguin splits into "Natural attractions" and "Man-made
 * attractions", Guiuan has the singular "Point of Interest".
 */
const TOURISM_SECTIONS = [
  "tourism",
  "tourist attractions",
  "tourist attraction",
  "points of interest",
  "point of interest",
  "natural attractions",
  "attractions",
] as const;

/** The prose a card shows: an explicit section, else Tourism for area articles, else the intro. */
function describe(extract: Extract, preferred?: string): string {
  if (preferred) {
    const named = extract.sections.get(preferred.toLowerCase());
    if (named) return named;
    console.warn(`  ! descriptionSection "${preferred}" not found — falling back to the intro`);
  }
  if (looksLikeAreaArticle(extract.intro)) {
    for (const title of TOURISM_SECTIONS) {
      const body = extract.sections.get(title);
      if (body) return body;
    }
  }
  return extract.intro;
}

type Coord = { lat: number; lon: number };

/**
 * `redirects=1` resolves e.g. "Oslob, Cebu" → "Oslob" server-side, and every
 * `pages` entry comes back keyed by the *resolved* title — so a naive
 * `out.set(page.title, ...)` silently drops results for any seed whose
 * `wikipedia` title isn't already the canonical one. `data.query.redirects`
 * lists the `from`/`to` pairs for the batch; walk it to also register the
 * result under whatever title was actually requested.
 */
function redirectMap(data: Json): Map<string, string> {
  const redirects = ((data.query as Json)?.redirects ?? []) as { from: string; to: string }[];
  return new Map(redirects.map((r) => [r.to, r.from]));
}

async function fetchCoordinates(titles: readonly string[]): Promise<Map<string, Coord>> {
  const out = new Map<string, Coord>();
  for (const batch of chunk(titles, 50)) {
    const data = await mwApi("en.wikipedia.org", {
      action: "query",
      titles: batch.join("|"),
      redirects: "1",
      prop: "coordinates",
      colimit: "max",
    });
    const fromByResolved = redirectMap(data);
    const pages = ((data.query as Json)?.pages ?? {}) as Record<string, Json>;
    for (const page of Object.values(pages)) {
      const coords = page.coordinates as { lat: number; lon: number }[] | undefined;
      if (!coords?.[0]) continue;
      const value = { lat: coords[0].lat, lon: coords[0].lon };
      out.set(page.title as string, value);
      const requested = fromByResolved.get(page.title as string);
      if (requested) out.set(requested, value);
    }
  }
  return out;
}

async function fetchUrls(titles: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const batch of chunk(titles, 50)) {
    const data = await mwApi("en.wikipedia.org", {
      action: "query",
      titles: batch.join("|"),
      redirects: "1",
      prop: "info",
      inprop: "url",
    });
    const fromByResolved = redirectMap(data);
    const pages = ((data.query as Json)?.pages ?? {}) as Record<string, Json>;
    for (const page of Object.values(pages)) {
      if (!page.fullurl) continue;
      out.set(page.title as string, page.fullurl as string);
      const requested = fromByResolved.get(page.title as string);
      if (requested) out.set(requested, page.fullurl as string);
    }
  }
  return out;
}

async function fetchExtracts(titles: readonly string[]): Promise<Map<string, Extract>> {
  const out = new Map<string, Extract>();
  // MediaWiki silently caps `exlimit` at 1 for whole-article (non-`exintro`)
  // extracts, no matter what's requested — one title per call is not an
  // optimisation choice here, it's the only mode the API actually supports
  // once you want more than the lead paragraph.
  for (const title of titles) {
    const data = await mwApi("en.wikipedia.org", {
      action: "query",
      titles: title,
      redirects: "1",
      prop: "extracts",
      explaintext: "1",
      exsectionformat: "wiki",
      exlimit: "1",
    });
    const pages = ((data.query as Json)?.pages ?? {}) as Record<string, Json>;
    for (const page of Object.values(pages)) {
      const extract = page.extract as string | undefined;
      if (extract) out.set(title, splitSections(extract));
    }
  }
  return out;
}

/**
 * Coordinates and a lead image from a Wikidata entity, for seeds English
 * Wikipedia has no article for (Osmeña Peak, Sambawan Island) or has an
 * article for but no coordinates on (Bantayan Island, Simala Shrine).
 *
 * `Special:EntityData/<id>.json` rather than `wbsearchentities` — a Q-id is
 * pinned in the seed by a person who checked it, and a name search would
 * happily return the wrong entity. "Sumilon Island", searched, resolves to a
 * lighthouse off Surigao, not the sandbar off Cebu.
 */
async function fetchWikidata(id: string): Promise<{ coord: Coord | null; image: string | null }> {
  const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`wikidata ${res.status} for ${id}`);
  const data = (await res.json()) as { entities: Record<string, Json> };
  const entity = data.entities?.[id];
  if (!entity) return { coord: null, image: null };

  const claims = (entity.claims ?? {}) as Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
  const point = claims.P625?.[0]?.mainsnak?.datavalue?.value as
    | { latitude: number; longitude: number }
    | undefined;
  const image = claims.P18?.[0]?.mainsnak?.datavalue?.value as string | undefined;

  return {
    coord: point ? { lat: point.latitude, lon: point.longitude } : null,
    image: image ? `File:${image}` : null,
  };
}

/**
 * Every photograph filed under a Commons category. Category *membership*, not
 * Commons' `list=search` — a free-text search for "Ulan-Ulan Falls" returns a
 * US National Archives photograph of Luzon as its top hit, and a wrong photo
 * on a card is precisely the failure the "no placeholders" rule exists to
 * prevent. A category is maintained by people who looked at the pictures.
 */
async function fetchCategoryImageTitles(category: string): Promise<string[]> {
  const data = await mwApi("commons.wikimedia.org", {
    action: "query",
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmtype: "file",
    cmlimit: "100",
  });
  const members = ((data.query as Json)?.categorymembers ?? []) as { title: string }[];
  return members
    .map((m) => m.title)
    .filter((t) => IMAGE_EXT.test(t) && !BAD_FILENAME.test(t));
}

async function fetchArticleImageTitles(title: string): Promise<string[]> {
  const data = await mwApi("en.wikipedia.org", {
    action: "query",
    titles: title,
    redirects: "1",
    prop: "images",
    imlimit: "max",
  });
  const pages = ((data.query as Json)?.pages ?? {}) as Record<string, Json>;
  const page = Object.values(pages)[0];
  const images = (page?.images as { title: string }[] | undefined) ?? [];
  return images
    .map((i) => i.title)
    .filter((t) => IMAGE_EXT.test(t) && !BAD_FILENAME.test(t));
}

type ImageInfoRaw = {
  title: string;
  url: string;
  width: number;
  height: number;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  extmetadata?: Record<string, { value?: string }>;
};

async function fetchImageInfo(fileTitles: readonly string[]): Promise<ImageInfoRaw[]> {
  if (fileTitles.length === 0) return [];
  const out: ImageInfoRaw[] = [];
  for (const batch of chunk(fileTitles, 50)) {
    const data = await mwApi("commons.wikimedia.org", {
      action: "query",
      titles: batch.join("|"),
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      // Commons originals run well past 10,000px on some of these articles
      // (a 9732×7507 skyline photo, an 11613px-wide panorama) — multiple
      // megabytes each, for a card that renders at a few hundred pixels.
      // `iiurlwidth` asks for a pre-rendered thumbnail alongside the
      // original; `toPlaceImage` below stores *that*, not `url`.
      iiurlwidth: "1600",
    });
    const pages = ((data.query as Json)?.pages ?? {}) as Record<string, Json>;
    for (const page of Object.values(pages)) {
      const info = (page.imageinfo as ImageInfoRaw[] | undefined)?.[0];
      if (info) out.push({ ...info, title: page.title as string });
    }
  }
  return out;
}

/** Strips Wikimedia's `utm_*` tracking params — noise we don't need and shouldn't redistribute. */
function cleanUrl(url: string): string {
  const parsed = new URL(url);
  parsed.search = "";
  return parsed.toString();
}

function toPlaceImage(info: ImageInfoRaw, alt: string): PlaceImage {
  const meta = info.extmetadata ?? {};
  const strip = (html?: string) => (html ? html.replace(/<[^>]+>/g, "").trim() : null);
  const hasThumb = Boolean(info.thumburl && info.thumbwidth && info.thumbheight);
  return {
    url: cleanUrl(hasThumb ? info.thumburl! : info.url),
    width: hasThumb ? info.thumbwidth! : info.width,
    height: hasThumb ? info.thumbheight! : info.height,
    alt,
    file: info.title,
    credit: {
      artist: strip(meta.Artist?.value),
      license: meta.LicenseShortName?.value ?? null,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(info.title.replace(/ /g, "_"))}`,
    },
  };
}

/** Landscape and reasonably large first — a portrait hero breaks every card layout in the app. */
function rankForHero(a: ImageInfoRaw, b: ImageInfoRaw): number {
  const aLandscape = a.width >= a.height;
  const bLandscape = b.width >= b.height;
  if (aLandscape !== bLandscape) return aLandscape ? -1 : 1;
  return b.width * b.height - a.width * a.height;
}

/**
 * A tiny (16px-wide) JPEG data URI for the hero's blur-up placeholder. Fetches
 * Commons' own thumbnail rendition rather than downscaling locally — no image
 * library dependency for one 16px JPEG per place.
 */
async function fetchBlurDataUrl(fileTitle: string): Promise<string | undefined> {
  const data = await mwApi("commons.wikimedia.org", {
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "16",
  });
  const pages = ((data.query as Json)?.pages ?? {}) as Record<string, Json>;
  const info = (Object.values(pages)[0]?.imageinfo as { thumburl?: string }[] | undefined)?.[0];
  if (!info?.thumburl) return undefined;

  const res = await fetch(info.thumburl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return undefined;
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function main() {
  const articleTitles = EDITORIAL_SEEDS.map((s) => s.wikipedia).filter((t): t is string => Boolean(t));
  console.log(
    `Fetching ${articleTitles.length} articles (${EDITORIAL_SEEDS.length - articleTitles.length} seed(s) sourced from Wikidata + Commons)…`,
  );

  const [coords, urls, extracts] = await Promise.all([
    fetchCoordinates(articleTitles),
    fetchUrls(articleTitles),
    fetchExtracts(articleTitles),
  ]);

  const atlas: Record<string, PlaceAtlasEntry> = {};
  const failures: string[] = [];

  for (const seed of EDITORIAL_SEEDS) {
    if (!seed.wikipedia && !seed.wikidata) {
      failures.push(`${seed.slug}: seed has neither a wikipedia title nor a wikidata id`);
      continue;
    }

    const extract = seed.wikipedia ? extracts.get(seed.wikipedia) : undefined;
    const wikipediaUrl = seed.wikipedia ? (urls.get(seed.wikipedia) ?? null) : null;

    if (seed.wikipedia && (!extract || !wikipediaUrl)) {
      failures.push(`${seed.slug}: "${seed.wikipedia}" resolved to no ${!extract ? "extract" : "url"}`);
      continue;
    }

    // Wikidata is the fallback for coordinates, not the default: an article's
    // own `prop=coordinates` is the more specific of the two when both exist.
    let coord = seed.wikipedia ? coords.get(seed.wikipedia) : undefined;
    let wikidataImage: string | null = null;
    if (seed.wikidata && (!coord || !seed.wikipedia)) {
      const wd = await fetchWikidata(seed.wikidata);
      coord = coord ?? wd.coord ?? undefined;
      wikidataImage = wd.image;
    }
    if (!coord) {
      failures.push(`${seed.slug}: no coordinates (add a wikidata id, or fix the article title)`);
      continue;
    }

    // Most specific source of photographs first: a hand-pinned file list, then
    // a hand-pinned Commons category, then whatever the article happens to
    // illustrate itself with, then Wikidata's single lead image.
    let candidateTitles: readonly string[] = [];
    if (seed.imageOverride && seed.imageOverride.length > 0) {
      candidateTitles = seed.imageOverride;
    } else if (seed.commonsCategory) {
      candidateTitles = await fetchCategoryImageTitles(seed.commonsCategory);
    } else if (seed.wikipedia) {
      candidateTitles = await fetchArticleImageTitles(seed.wikipedia);
    }
    if (candidateTitles.length === 0 && wikidataImage) candidateTitles = [wikidataImage];

    const infos = (await fetchImageInfo(candidateTitles)).filter((i) => i.width >= 640);
    if (infos.length === 0) {
      failures.push(`${seed.slug}: no usable images (try commonsCategory or imageOverride)`);
      continue;
    }

    const ranked = [...infos].sort(rankForHero);
    const [heroRaw, ...galleryRaw] = ranked;
    const heroImage = toPlaceImage(heroRaw, seed.name);
    heroImage.blurDataUrl = await fetchBlurDataUrl(heroRaw.title);

    const gallery = galleryRaw.slice(0, 7).map((info) => toPlaceImage(info, seed.name));

    const description = extract ? describe(extract, seed.descriptionSection) : null;
    // A seed whose reason to exist *is* its history (`Limasawa`, where the
    // first Mass in the country was said) sets `descriptionSection: "History"`
    // — printing the same text again under "A little history" would just be
    // the page repeating itself.
    const historySection = extract?.sections.get("history") ?? null;
    const history = historySection && historySection !== description ? historySection : null;

    atlas[seed.slug] = {
      latitude: coord.lat,
      longitude: coord.lon,
      description,
      history,
      wikipediaUrl,
      heroImage,
      gallery,
      fetchedAt: new Date().toISOString(),
    };
    const via = seed.wikipedia ? "wikipedia" : `wikidata:${seed.wikidata}`;
    console.log(
      `✓ ${seed.slug} (${via}, hero ${heroRaw.width}×${heroRaw.height}, ${gallery.length} gallery)`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} place(s) failed to build a complete atlas entry:`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error("\nFix the seed (wrong title, or add imageOverride) before shipping — no placeholders.");
    process.exitCode = 1;
    return;
  }

  await writeFile(OUT_PATH, `${JSON.stringify(atlas, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${Object.keys(atlas).length} entries to ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
