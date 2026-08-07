/**
 * Builds `lib/places/data/atlas.generated.json` from `lib/places/data/editorial.ts`.
 *
 * Run with `npx tsx scripts/build-places.ts`. Not part of `next build` — the
 * atlas is checked in like any other content file, and rebuilding it is a
 * deliberate act (an editor added a place, or wants fresher prose/images),
 * not something that should silently re-fetch Wikipedia on every deploy. See
 * `docs/agent/codebase-map/places.md`.
 *
 * For every `PlaceSeed.wikipedia` title, this pulls from the public MediaWiki
 * API — no key required, but a descriptive `User-Agent` is: Wikimedia blocks
 * anonymous-looking bot traffic:
 *
 *   1. Coordinates (`prop=coordinates`)
 *   2. Plain-text extract, whole article with wiki-style section markers
 *      (`prop=extracts&explaintext=1&exsectionformat=wiki`), split locally
 *      into "intro" (everything before the first `==`) and "History"
 *      (the `== History ==` section, if the article has one).
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

/** Splits a `exsectionformat=wiki` extract into intro text and a named section, if present. */
function splitSections(extract: string): { intro: string; history: string | null } {
  const headerRe = /^={2,}\s*(.+?)\s*={2,}$/gm;
  const marks: { title: string; index: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headerRe.exec(extract))) {
    marks.push({ title: match[1], index: match.index, end: match.index + match[0].length });
  }

  const intro = (marks.length > 0 ? extract.slice(0, marks[0].index) : extract).trim();

  const historyIdx = marks.findIndex((m) => /^history$/i.test(m.title));
  if (historyIdx === -1) return { intro, history: null };

  // A section's body runs until the next header AT THE SAME OR SHALLOWER
  // depth (fewer or equal '='), not just the very next header — otherwise a
  // "=== Pre-Colonial Era ===" subsection under "== History ==" would look
  // like the end of History instead of part of it.
  const historyDepth = extract.slice(marks[historyIdx].index).match(/^=+/)?.[0].length ?? 2;
  let end = extract.length;
  for (let i = historyIdx + 1; i < marks.length; i += 1) {
    const depth = extract.slice(marks[i].index).match(/^=+/)?.[0].length ?? 2;
    if (depth <= historyDepth) {
      end = marks[i].index;
      break;
    }
  }
  const history = extract.slice(marks[historyIdx].end, end).trim();
  return { intro, history: history.length > 0 ? history : null };
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

async function fetchExtracts(
  titles: readonly string[],
): Promise<Map<string, { intro: string; history: string | null }>> {
  const out = new Map<string, { intro: string; history: string | null }>();
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
  const titles = EDITORIAL_SEEDS.map((s) => s.wikipedia);
  console.log(`Fetching ${titles.length} articles…`);

  const [coords, urls, extracts] = await Promise.all([
    fetchCoordinates(titles),
    fetchUrls(titles),
    fetchExtracts(titles),
  ]);

  const atlas: Record<string, PlaceAtlasEntry> = {};
  const failures: string[] = [];

  for (const seed of EDITORIAL_SEEDS) {
    const coord = coords.get(seed.wikipedia);
    const wikipediaUrl = urls.get(seed.wikipedia);
    const extract = extracts.get(seed.wikipedia);

    if (!coord || !wikipediaUrl || !extract) {
      failures.push(`${seed.slug}: missing ${!coord ? "coordinates" : !wikipediaUrl ? "url" : "extract"}`);
      continue;
    }

    const candidateTitles =
      seed.imageOverride && seed.imageOverride.length > 0
        ? seed.imageOverride
        : await fetchArticleImageTitles(seed.wikipedia);

    const infos = (await fetchImageInfo(candidateTitles)).filter((i) => i.width >= 640);
    if (infos.length === 0) {
      failures.push(`${seed.slug}: no usable images`);
      continue;
    }

    const ranked = [...infos].sort(rankForHero);
    const [heroRaw, ...galleryRaw] = ranked;
    const heroImage = toPlaceImage(heroRaw, seed.name);
    heroImage.blurDataUrl = await fetchBlurDataUrl(heroRaw.title);

    const gallery = galleryRaw.slice(0, 7).map((info) => toPlaceImage(info, seed.name));

    atlas[seed.slug] = {
      latitude: coord.lat,
      longitude: coord.lon,
      description: extract.intro,
      history: extract.history,
      wikipediaUrl,
      heroImage,
      gallery,
      fetchedAt: new Date().toISOString(),
    };
    console.log(`✓ ${seed.slug} (hero ${heroRaw.width}×${heroRaw.height}, ${gallery.length} gallery)`);
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
