# 2026-08-08 — Places: Cebu/Leyte hydration wave, and the end of the census-stub cards

Follow-on to [`2026-08-08-places-launch-fixes.md`](2026-08-08-places-launch-fixes.md). Two
complaints drove this, both correct:

1. Eastern Visayas and Cebu were under-represented — 6 and 4 entries out of 55, the same weight as
   Mimaropa, in a book belonging to two people from Leyte and Cebu.
2. Cards were showing the **general area, not the destination**. `oslob` rendered *"a municipality
   in the province of Cebu. According to the 2024 census, it has a population of 29,378 people"*
   under a photograph of a whale shark. Same for `moalboal`, `biliran`, `tacloban`, `camiguin`.

## What shipped

**Atlas 55 → 91 places.** Cebu 4 → 22, Leyte-and-neighbours 6 → 24. Together about half the atlas.

**A second sourcing path: Wikidata + Commons category.** `PlaceSeed.wikipedia` is now optional;
`wikidata` (a pinned Q-id) supplies coordinates and `commonsCategory` supplies photographs when
English Wikipedia has no article. Four entries use it today — `osmena-peak`, `sumilon-island`,
`sambawan-island`, `casa-gorordo` — and `PlaceAtlasEntry.description` / `wikipediaUrl` became
nullable to accommodate them. The detail page falls back to the seed's editorial `note`, which is
the honest substitute: a hand-written line in the book's voice is editorial and always was, where
a hand-written *fact* is the thing the data model refuses to hold.

**`descriptionSection`, plus an automatic Tourism fallback.** A seed can name the article section
its prose comes from; `oslob` uses `"Whale shark watching"`, `tacloban` `"Culture"`, `limasawa`
`"History"`. For anything not explicitly set, `looksLikeAreaArticle` detects a census-stub intro
and prefers a Tourism-ish section — `TOURISM_SECTIONS` lists the seven spellings LGU articles
actually use, because Moalboal says "Tourism", Oslob says "Tourist attractions", Biliran says
"Points of interest", Camiguin says "Natural attractions" and Guiuan says the singular "Point of
Interest".

`splitSections` now returns *every* section rather than just History, strips nested `=== … ===`
fencing out of section bodies (Camiguin's "Natural attractions" opened with a literal
`=== Volcanoes ===` line), and the history block is suppressed when it would duplicate a
`descriptionSection: "History"` description.

Two existing Leyte heroes were upgraded by pointing them at Commons categories:
`kalanggaman-island` 960px → 5772px, `lake-danao-leyte` 1014px → 4624px.

## Research notes worth not repeating

~60 candidate destinations were probed against the live MediaWiki, Wikidata, Commons and Overpass
APIs before any seed was written. Conclusions:

- **Wikipedia is good for heritage and blind to nature.** Every colonial church and every
  municipality has an article. Osmeña Peak — the highest point in Cebu — does not. Neither do
  Sumilon, Aguinid Falls, Sambawan, Tinago Falls, Ulan-Ulan Falls, Higatangan, Alto Peak, Temple
  of Leah or Tops Lookout. `Tumalog Falls` *redirects to Oslob*, which is the granularity bug in
  miniature.
- **Never search Wikidata or Commons by name.** `"Sumilon Island"` searched resolves to a
  lighthouse off Surigao (the right island is `Q2365217`). A Commons file search for
  `"Ulan-Ulan Falls"` returns a US National Archives photograph of Luzon; `"Alto Peak"` returns a
  mountain in Colorado. Every Q-id and category in `editorial.ts` was opened and checked.
- **OpenStreetMap is a discovery aid, not a curation source.** Overpass returns 235 named features
  across Leyte/Samar/Biliran and 286 around Cebu, but 1 of 235 carries a Wikidata link and the
  names include "ROCK", "Samantha Python" and private fishponds.
- **Facebook was evaluated and rejected as an automated source.** Page posts need Page Public
  Content Access → App Review, which Meta documents as not covering external research; unofficial
  scrapers violate the terms. Decisively, LGU and blogger photos are all-rights-reserved and
  cannot ship beside the Commons attribution block. Facebook stays useful as *reading* for whoever
  writes an editorial `note`.

## What the next session should watch out for

**The remaining Cebu/Leyte gap is a licensing gap, not a research gap.** Tan-awan Peak and the
Leyte sea-of-clouds viewpoints, Mount Lobi, Tumalog Falls, Aguinid Falls, Higatangan, Tinago and
Ulan-Ulan Falls, Tops Lookout, the Temple of Leah, Sirao, the roses cafés — all verified absent
from all three free sources. They exist almost only on Facebook.

Adding them requires a third seed path: a hand-authored description plus a photograph the couple
owns or has permission for, stored like every other user image (signed Supabase Storage URL, not a
remote host — `next.config.ts` only allows `upload.wikimedia.org`), credited as their own and
flagged so it never reads as licensed third-party work. That is a deliberate loosening of the
"never hand-typed facts" invariant and was **not** built here — it needs its own decision, and
`Place.verified` is the field that would carry the distinction.

Slugs were held stable throughout (`oslob` is still `oslob`, now displayed as "Whale Sharks at
Oslob") because `place_slug` is a key in `place_saves` and `place_shown_log`; renaming one orphans
every save.
