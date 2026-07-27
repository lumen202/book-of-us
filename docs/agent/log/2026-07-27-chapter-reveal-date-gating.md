# 2026-07-27 — Chapters gated by their own reveal date

## Why

`listChapters()` returned every non-deleted chapter regardless of date, so the whole shelf was
visible immediately instead of growing one chapter at a time as the book is meant to. The ask was
to gate the shelf so it fills in incrementally, on the 5th of each month — the same day
`getNextChapterDate` already treats as when a chapter "arrives".

## Shipped

- `lib/relationship/nextChapter.ts`: added `getChapterRevealDate(month)` (the 5th of that
  chapter's own month, local midnight) and `isChapterRevealed(month, now?)`. Pure, reuses the
  existing `CHAPTER_DAY` constant.
- `lib/chapters/queries.ts`: both `listChapters()` and `getChapterBySlug()` now filter through
  `isChapterRevealed`. A not-yet-arrived chapter is invisible on the shelf *and* 404s if its slug
  is guessed or bookmarked ahead of time — gating only the list would have left a back door.
- Filtering happens in application code, not SQL/RLS: this is pacing, not a security boundary
  (both partners already see the same shared book), so it doesn't need the RPC-enforced pattern
  `lib/memories/queries.ts` uses for time-capsule memories.
- Updated `docs/agent/codebase-map/reading-experience.md` with the invariant.

## Design decisions made without asking

- **Gate is per-chapter-month, not per-elapsed-monthsary.** A chapter unlocks based on its own
  `month` field reaching its 5th — not on a count of monthsaries since `relationship.started_at`.
  These are different concepts that happen to agree in the common case; the per-chapter-month
  version was already fully implied by the existing `getNextChapterDate` doc comment ("chapters
  arrive on the 5th of every month") and needs no dependency on the relationship's start date.
- **Hidden, not locked-placeholder.** An unrevealed chapter doesn't render at all, rather than
  showing as a dimmed "coming soon" card. This matches the existing empty-shelf copy and leaves
  `ClosingReflection`'s "next chapter" line as the only hint of what's coming.

## Verified

- `npx tsc --noEmit`, `npx eslint .` clean.
- Worked through the scenario as given: relationship `started_at` = 2026-07-05 (seed data).
  Confirmed `getMonthsaryNumber` reports 0 on the real current date (2026-07-27) and 1 on
  2026-08-05 — i.e. August 5 is indeed the first monthsary, as stated. Confirmed a hypothetical
  August-dated chapter is hidden through Aug 4, revealed exactly on Aug 5, and stays revealed
  after (script run outside the repo, not committed).
- With the current seed data (chapters dated Jan/Apr/Jul 2026 only), **nothing visibly changes**
  under either date — all three are already past their reveal dates in both cases, since no
  chapter has been authored for August yet. The gating is correct and ready; there's just nothing
  currently seeded for it to hide.

## Notes for next session

- If you want to actually see a hide → reveal transition locally before the real clock reaches
  a given date, there's no dev-preview override for "now" the way `CelebrationDevToggle` provides
  one for Celebration Mode. Wasn't built here since it wasn't asked for — flag if wanted, it'd
  follow the same `?param` + localStorage pattern.
- "Composer (new *chapter*)" is still unbuilt (`codebase-map/INDEX.md`), so today the only way to
  add a real August chapter is a manual insert, same as the seed file.
