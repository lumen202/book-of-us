# Places — Destination Discovery

A premium destination-discovery feature for travel around the Philippines: `/places`. Built to
answer "where should we travel this weekend?" without ever feeling like a searchable directory —
see the Experience Direction Invariants at the top of `AGENTS.md`. Discovery (Surprise Me, Spin
the Wheel, Lucky Draw, Daily Pick, Weekend Escape, Hidden Gem Mode) is the front door;
`/places/browse` is where search/filter lives, deliberately one level away from the landing page.

## The data model: seed ⋈ atlas, never hand-typed facts

Every fact that could go stale (coordinates, description, history, licensed photography) is
**fetched, not hand-typed** — from Wikipedia, Wikidata and Wikimedia Commons, at build time, by
`scripts/build-places.ts`. Only the editorial judgment (which category, when to go, how hard,
one line in the book's own voice, hand-picked tips) is written by a person.

```
lib/places/data/editorial.ts          hand-authored PlaceSeed[] — the only file a person edits
lib/places/data/atlas.generated.json  fetched PlaceAtlasEntry per slug — regenerate, don't hand-edit
lib/places/data/index.ts              joins the two into PLACES: Place[]
scripts/build-places.ts               the fetcher — run via `npm run build:places`
```

**Adding a place:** add a `PlaceSeed` to `editorial.ts`, then run `npm run build:places`. The
script fails the whole build (no partial/placeholder entries) if a seed doesn't resolve to
coordinates plus at least one landscape-ish, usably-licensed image — see the script's own header
comment for exactly what it fetches and why each step is shaped the way it is (in particular:
MediaWiki caps `exlimit` at 1 for whole-article extracts no matter what's requested, so extracts
are fetched one title at a time, and `redirects=1` means every fetcher has to register results
under both the resolved *and* the requested title or a redirected title like `"Oslob, Cebu"` →
`"Oslob"` silently loses its data).

### Two ways a seed is sourced

English Wikipedia's coverage of this country is very uneven — an article for every municipality
and every colonial church, and *nothing* for Osmeña Peak, Sambawan Island, Casa Gorordo or
Sumilon. So a seed picks one of two paths:

| Field | When |
|---|---|
| `wikipedia` | The default. Coordinates, prose and photos from one article. |
| `wikidata` | A pinned Q-id. Coordinates when there's no article, or the article has none (`Bantayan Island`, `Simala Shrine`, `Langun-Gobingob Cave` all have articles with no coordinates). |
| `commonsCategory` | Photographs from a Commons *category* instead of the article's own images. |
| `imageOverride` | Explicit Commons file titles. Beats everything else. |
| `descriptionSection` | Take the prose from a named article section instead of the intro. |

Two rules that are not negotiable here, both learned the hard way:

1. **Pin Wikidata Q-ids and Commons categories, never search for them.** A name search for
   `"Sumilon Island"` returns a *lighthouse off Surigao*; a Commons file search for
   `"Ulan-Ulan Falls"` returns a US National Archives photograph of Luzon. A category is curated
   by people who looked at the pictures; a search result is a guess, and a wrong photo on a card
   is exactly what the "no placeholders" rule exists to prevent.
2. **A `wikidata`-sourced seed has `description: null`**, and the detail page falls back to the
   seed's editorial `note`. A hand-written *line in the book's voice* is editorial and always
   was; a hand-written *fact* is the one thing this data model refuses to hold.

### Point a seed at the destination, not the town around it

Every municipality has a bot-maintained article whose intro is a census stub, so
`wikipedia: "Oslob"` used to put *"a population of 29,378 people"* on a card under a photograph of
a whale shark. Seed the destination itself where an article exists (`Tumalog Falls`, not `Oslob`).
Where it doesn't, `descriptionSection` reaches the part of the area's article that is actually
about the place — `oslob` uses `"Whale shark watching"`, `tacloban` uses `"Culture"`, `limasawa`
uses `"History"` because the first Mass in the country *is* the reason to go.

As a safety net, `looksLikeAreaArticle` in the build script detects a census-stub intro and
prefers a Tourism-ish section automatically (`TOURISM_SECTIONS` covers the seven spellings
Philippine LGU articles actually use — "Tourism", "Tourist attractions", "Points of interest",
"Natural attractions", …). The net is a fallback, not a licence to seed municipalities.

Images are Wikimedia Commons thumbnails capped at 1600px wide (not the raw originals, several of
which are 10,000px+ panoramas) with `utm_*` tracking params stripped, plus a 16px blur-up JPEG
inlined as `blurDataUrl`. `next.config.ts`'s `images.remotePatterns` allows
`upload.wikimedia.org`; nothing else is ever a remote `<Image>` host in this app (everything else
is a signed Supabase Storage URL).

**No review scores, no named hotels/restaurants.** `Place.rating` is `null` everywhere — the field
exists for a future reviews provider to fill, and a number nobody actually gave the place is worse
than none. `nearbyHotelsUrl`/`nearbyRestaurantsUrl` (`lib/places/maps.ts`) are Google Maps
*searches* around the real coordinates, not a hand-typed business list that goes stale the first
time a restaurant closes.

## `lib/places/` — everything else

| File | What it's for |
|---|---|
| `types.ts` | `PlaceSeed`/`PlaceAtlasEntry`/`Place`/`PlaceSummary` — read the header comment first |
| `taxonomy.ts` | Every label for a coded value (category, activity, budget, ...) — copy, not schema |
| `source.ts` | The **only** door into the atlas — `getAllPlaces`/`getPlaceBySlug`/`searchPlaces`. Swapping the data source later (Supabase, a CMS) means editing this file only |
| `engine.ts` | `pickPlace`/`pickManyPlaces` (weighted random, excludes recently-shown, favours unseen/seasonal/featured) and `dailyPick` (seeded by date, same result for both of you all day) |
| `wheel.ts` | Equal-wedge segment geometry from `CATEGORY_ORDER`, spin/rotation math |
| `maps.ts` | Google Maps/Directions/`geo:` links, an OSM embed URL, and `dealsSearchUrl` (see below) |
| `images.ts` | The image provider-swap seam — `resizedCommonsUrl`, `HERO_SIZES`/`CARD_SIZES` |
| `trip.ts` | `HOME_BASE` + real haversine distance — see "Distance, not Manila" below |
| `journal/` | Supabase-backed saves (wishlist/visited) and the shown-log — see below |

## Cebu and Leyte deliberately dominate the atlas

Of 91 places, 22 are in Cebu and 24 are Leyte-and-its-neighbours (Leyte, Southern Leyte, Biliran,
Samar, Eastern Samar) — about half the atlas in two people's home provinces. That is intentional
and is the same reasoning as `FAVORITE_REGIONS` in `preferences.ts` taken one level down: a
weighting boost can only favour places that are in the atlas at all, so making home turf come up
often is first a *content* decision and only then a weighting one. A general Philippine travel
list would be roughly the inverse, and would be the wrong book.

### What the free sources cannot reach

Some of the best-loved spots in both provinces have **no** Wikipedia article, no Wikidata item and
no Commons photograph — checked, not assumed. Tan-awan Peak and the Leyte sea-of-clouds
viewpoints, Mount Lobi, Aguinid Falls, Tumalog Falls (a Wikidata item exists but carries no
coordinates), Higatangan Island, Tinago and Ulan-Ulan Falls in Biliran, Osmeña Peak's neighbours
Lugsangan Peak and Mount Lanaya, Tops Lookout, the Temple of Leah, Sirao Flower Garden, the roses
cafés. These are documented almost exclusively on Facebook — LGU tourism pages and travel-blog
posts.

**Facebook was evaluated as a source and rejected.** Page posts require Page Public Content
Access, which requires App Review and which Meta's own documentation says does not cover external
research use; unofficial scrapers violate the terms. More decisively, LGU and blogger photographs
are all-rights-reserved, so they cannot ship next to the Commons attribution block
`PlaceGallery` renders. Facebook is legitimate *reading* for whoever writes a seed's editorial
`note` — it is not an automated feed, and shouldn't become one.

Reaching those places needs a third source path (a hand-authored description plus a photograph
this couple owns or has permission for, credited as such and flagged so it never masquerades as
licensed third-party work). That is a deliberate loosening of the "never hand-typed facts" rule
and has not been built — see `log/2026-08-08-places-cebu-leyte-hydration.md`.

## Personalization: hand-set, like `CURRENT_SEASON`

`lib/places/preferences.ts` holds two small, hand-edited constants that nudge (never filter) the
randomiser in `engine.ts`'s `weightFor`: `FAVORITE_REGIONS` (Eastern Visayas / Region VIII — where
this couple is actually from, Leyte and Cebu both) and `FAVORITE_CATEGORIES` (`mountain`, `nature`
— what tends to win when asked "where should we go"). Same convention as `CURRENT_SEASON` in
`lib/theme/tokens.ts` and `HOME_BASE` in `trip.ts`: edited by hand when it stops being true, not
inferred from data this app doesn't collect. The boost is small and additive (`weightFor` adds a
fraction of the base weight, same mechanism as the seasonal/featured bumps) — discovery still
shows everywhere else, just a bit more often shows what you'd actually pick.

## Distance is computed from Cebu, not assumed from Manila

Nearly every Philippine travel site frames "how far is this" from Metro Manila. This couple
doesn't share a city — `lib/places/trip.ts`'s `HOME_BASE` is hand-set to Cebu (same convention as
`CURRENT_SEASON` in `lib/theme/tokens.ts`: edited by hand, not computed), because Cebu is the real
hub either of them would actually use to get anywhere in the Visayas or Mindanao. `TripLength`
(`day-trip`/`weekend`/...) stays an editorial, origin-independent judgment of effort; the "X km, a
half-day's travel" badge on the reveal card and detail page is the live, distance-aware answer,
computed from `HOME_BASE` via `estimateTrip`.

## The randomiser: `lib/places/engine.ts`

One function, `pickPlace`, backs every discovery mode. It filters by whatever the mode asks
(category for the wheel, `hiddenGemOnly` for Hidden Gem Mode, `tripLength` for Weekend Escape),
then **excludes recently-shown slugs — softly**: if excluding them would leave nothing, it falls
back to the full filtered pool rather than ever returning nothing. `pickManyPlaces` (Lucky Draw)
is deliberately a separate implementation, not a loop over `pickPlace`: that soft-fallback is
correct for "give me one more," wrong for "give me 4 distinct cards" — see the comment on
`pickManyPlaces` for the bug this fixed (a naive loop repeated cards once the pool ran dry).

`dailyPick` is the one seeded exception — same `mulberry32` generator the ambient backdrop uses in
`lib/ambient/rng.ts`, seeded from the date string so both of you get the same destination until
local midnight, with no database write needed to make that true.

Unit tests: `lib/places/*.test.ts`, run with `npm test` (`node:test` + `tsx`, no new dependency —
this is still the only test suite in the repo).

## The journal: Supabase, not localStorage

Favorites/visited-marks/shown-history persist through Supabase like everything else in this app —
`supabase/migrations/0012_places.sql` (+ `0013_places_demo.sql` for the `demo` schema, per
`demo.md`'s "mirror every table" convention). Two tables:

- **`place_saves`** — `(place_slug, user_id, list)`, `list` is `wishlist` or `visited`. Same
  soft-delete-and-upsert shape as `memory_reactions`. Read as **shared** (`getSavedSlugs` returns
  slugs saved by *either* of you) — this is one shared wishlist, not two private ones, the same
  mental model as the bucket list. One consequence worth knowing: if both of you independently
  saved the same place and only one un-saves, it still shows saved, because the other's row is
  still true. That's intentional.
- **`place_shown_log`** — append-only, `(place_slug, user_id, source, shown_at)`. What
  `getRecentlyShownSlugs` reads to feed `pickPlace`'s exclusion set — scoped to the **current**
  user, not shared, so the two of you opening the book the same evening don't cross-pollinate each
  other's "already seen this" state.

`place_slug` is a plain `text` column, not a foreign key — there is no `places` table. The atlas
lives in the codebase (`lib/places/data/`), not the database; a slug is just a stable string both
sides agree on.

`app/(app)/places/actions.ts` is the thin `"use server"` wrapper `lib/places/journal/mutations.ts`
needs, plus `addPlaceToBucketList` — "we should go here" writes a promise onto the *existing*
bucket list (`lib/bucket-list/mutations.ts`'s `addItem`), rather than this feature inventing a
second, parallel favorites concept. `toBucketCategory` narrows the atlas's 20 travel categories
down to the bucket list's fixed 7 — lossy on purpose, matching how `bucket_list_items.category` is
modelled everywhere else (`bucket-list.md`).

## The UI: one reveal, five doors

`components/places/PlaceRevealCard.tsx` is the single "here's your destination" layout — image,
facts, activities, Maps/Directions/save/share/another. Surprise Me, the wheel's result, a flipped
Lucky Draw card, Weekend Escape's pick, and Daily Pick all render this same component (`Daily Pick`
inline on the page; the other four inside `PlaceRevealOverlay.tsx`, a modal shaped like
`CompletionModal.tsx`'s reveal). One component defining the reveal is what makes five discovery
modes read as five doors into the same room instead of five different apps.

`components/places/SurpriseMe.tsx` also *is* the Hidden Gem Mode trigger — same mechanic
(pick/reveal/remember-shown) with `hiddenGemOnly` set, rather than a near-duplicate component.

No coloured category badges anywhere — `bucket-list.md`'s `CategoryFilterRow` note (BUG-004: a row
of coloured pills reads as a dashboard filter bar) applies here just as much. Category shows as
plain small-caps text, same register as `ChapterCover`'s month label.

**Share** is Copy Link + `navigator.share` where it exists, deliberately not a hand-built
Instagram-story-image generator or a from-scratch QR encoder — `navigator.share` already reaches
every platform that supports it correctly, via the OS's own share sheet; a bespoke canvas renderer
on top of that would be a second, worse version of something the browser does well. See
"Deliberately not built" below.

**"Check current tour & flight deals"** (the detail page's Practical section) is a plain Google web
search scoped to the place's name and province — not a hand-built link into a specific agency's
own search (Klook/Traveloka/Skyscanter's query-string formats aren't publicly documented and
change without notice; a guessed-at parameter risks a 404 instead of a search, which is exactly the
"no broken links" requirement this whole feature is built around). A live search also surfaces
whichever agency is actually running a promo *right now* rather than betting on one.

## Deliberately not built

- **A live scraper for travel-agency promos/packages.** Considered and explicitly declined in
  favour of the Google-search link above — scraping third-party commercial sites is fragile
  (breaks on any HTML change), may violate those sites' terms of service, and promo data goes
  stale within days. If this is revisited, it needs its own design pass, not a bolt-on.
- **Itinerary/budget planning, packing checklists, offline mode, gamification/badges, flight/hotel
  booking.** All explicitly future-features in the original brief; the data model (`Place`,
  `lib/places/journal/`) is shaped so none of them need a schema change to add later — an
  itinerary is just an ordered list of slugs, a badge is just a read over `place_saves`.
- **Weather / opening hours, per-place.** Fabricating plausible-looking hours or a forecast for 50
  places with no verified source would be worse than omitting them — see the "no placeholders"
  rule this whole feature was built under. `bestMonths` (seasonal, verified via the source article)
  is the closest honest substitute.
- **Named local emergency numbers per place.** One nationwide number
  (`NATIONWIDE_EMERGENCY_NUMBER` in `taxonomy.ts`, 911) plus a link to the Department of Tourism's
  own channel, rather than a per-destination number nobody's verified still rings.
