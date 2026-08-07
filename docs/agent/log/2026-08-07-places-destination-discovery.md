# Places — destination discovery feature

**2026-08-07.** Built the full "Places" feature from a detailed brief: a premium Philippines
destination-discovery experience (Surprise Me, Spin the Wheel, Lucky Draw, Daily Pick, Weekend
Escape, Hidden Gem Mode, plus a search/browse page and a full destination detail page). Full
design/architecture writeup is `docs/agent/codebase-map/places.md` — this entry is what to know
before touching it next, not a repeat of that doc.

## The data is real, not placeholder

The brief was explicit: no placeholder images, no broken links, no fabricated facts. So instead of
hand-typing 50 destinations, `scripts/build-places.ts` fetches every fact that could go stale
(coordinates, description, history section, a licensed hero + gallery photos with real Commons
attribution) from Wikipedia/Wikimedia Commons at build time, and **fails the whole build** if any
entry doesn't resolve to a real article with coordinates and a usable image. 50 places currently
in `lib/places/data/editorial.ts`, verified one by one against the live API before being written
down (see the tool-call history in this session if the reasoning behind a specific pick is ever
needed — not repeated here).

Two MediaWiki API gotchas worth remembering if this script is ever touched again:
- `exlimit` silently caps at **1** for whole-article extracts (not `exintro`) no matter what's
  requested — the fetcher has to be one-title-per-request, not batched.
- `redirects=1` returns pages keyed by the *resolved* title. A seed whose `wikipedia` title is a
  redirect (e.g. `"Oslob, Cebu"` → `"Oslob"`) silently gets no data back unless the fetcher walks
  `data.query.redirects` and registers the result under the *requested* title too. Cost a full
  round of `null coordinates` failures before this was caught.

## Home base is Cebu, not Manila

Caught mid-session: this couple doesn't share a city (one in Leyte, one in Cebu), and almost every
Philippine travel site assumes a Manila-based reader for "how far is this." `lib/places/trip.ts`'s
`HOME_BASE` is hand-set to Cebu — same pattern as `CURRENT_SEASON` — and every "X km, a half-day's
travel" badge is computed live from real coordinates rather than assumed. `TripLength` stays an
origin-independent editorial judgment of effort; only the distance badge is home-base-aware.

## Two things explicitly scoped down, on request

- **Travel-agency promo/deal scraping**, asked about mid-build. Declined in favour of a plain
  Google-search link (`dealsSearchUrl` in `lib/places/maps.ts`) after weighing it with the user —
  a live scraper against third-party commercial sites is fragile, may violate ToS, and promo data
  goes stale in days. If this comes back, it's a new design pass, not a bolt-on to this one.
- **DB migration application.** Two new tables were needed
  (`supabase/migrations/0012_places.sql` + `0013_places_demo.sql`, for `place_saves`/
  `place_shown_log`). Applying schema changes to the live project isn't something to do
  unprompted — asked first; the user applied it themselves via the SQL editor before this session
  ended. Verified end-to-end afterward via a temporary local dev server signed in through `/demo`:
  all three new routes (`/places`, `/places/[slug]`, `/places/browse`) returned 200 with real
  content and the Wikimedia images resolving through Next's image optimizer.

## What the next session should know

- `npm run build:places` regenerates `lib/places/data/atlas.generated.json` — re-run it if
  `editorial.ts` changes, never hand-edit the generated file.
- `npm test` runs the new (only) test suite in this repo — `node:test` + `tsx`, pure-function
  coverage of the randomiser/wheel/taxonomy formatting. No new dependency.
- Deliberately not built this round: itinerary/budget planning, packing lists, offline mode,
  gamification — all pre-flagged as future work in the brief, and the data model (`Place`,
  `place_saves`) doesn't need a schema change to grow into any of them later. See the "Deliberately
  not built" section of `places.md` for the full list and reasoning per item.
