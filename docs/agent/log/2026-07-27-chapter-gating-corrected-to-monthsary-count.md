# 2026-07-27 — Chapter gating corrected: monthsary count, not each chapter's own date

Supersedes [`2026-07-27-chapter-reveal-date-gating.md`](2026-07-27-chapter-reveal-date-gating.md)
— that entry's model shipped, was checked against the running dev server, and was wrong. Recorded
here rather than editing the old entry, per the log convention.

## Why the first model was wrong

The first pass gated each chapter by comparing its own `month` field to real "today" (`chapters
arrive on the 5th` — literally). It passed every check I wrote for it and still failed the moment
the user looked at the actual running app: all three seed chapters (Jan/Apr/Jul 2026) were already
in the past relative to any real "today", so the shelf always showed all three no matter what date
it was. The checks I ran were checking that my model matched itself, not that it matched the
product's actual timeline.

The real ask, confirmed over several corrections: chapters unlock **one at a time, in order, as
monthsaries pass since `relationship.started_at`** — not by whatever date happens to be stamped on
them. Before the first monthsary, the shelf should be empty.

## A second wrong guess, from the same root cause

First fix attempt revealed chapters oldest-`month`-first by rank against elapsed monthsary count.
Logically consistent, and still wrong in a way the user caught immediately: with the *existing*
seed data, "oldest" was January 2026 — dated six months *before* the relationship even started
(`started_at` 2026-07-05). The first monthsary correctly unlocked exactly one chapter, and that
chapter was titled "Where It Began" and dated January. Confusing, and rightly questioned
("why do we even have january?").

The gating logic itself (oldest-`month`-first by rank, counted against elapsed monthsaries) turned
out to be correct — the seed data was the actual problem. Once the seed only contains chapters
dated at or after the relationship's real first monthsary, "oldest first" and "matches the
corresponding calendar month" are the same thing.

## Shipped

- `lib/relationship/nextChapter.ts`: `getElapsedMonthsaries(startDate, now)` replaces the earlier
  `getChapterRevealDate`/`isChapterRevealed` pair. Day-of-month aware (holds the current calendar
  month back until its own 5th has passed) — safe to call on any day, unlike the existing
  `getMonthsaryNumber` in `monthsary.ts`, which says in its own comment it's only safe on the 5th.
- `lib/chapters/queries.ts`: `listRevealedChapters()` fetches chapters oldest-month-first, fetches
  `relationship`, and slices to `getElapsedMonthsaries(started_at, now)` chapters. `listChapters()`
  reverses for newest-first display (unchanged shelf order); `getChapterBySlug()` filters the same
  set, so a not-yet-unlocked chapter still 404s on a guessed/bookmarked slug.
- `lib/relationship/devClock.ts` (new): `getAppNow()`. Real `new Date()` in production, always.
  In local dev, defaults to 2026-08-05 (the real first monthsary) so there's something to build
  against without waiting for the actual calendar to catch up; overridable via `DEV_NOW` in
  `.env.local`. Threaded through `listRevealedChapters()` and both pages' "next chapter" countdown
  (`app/(app)/page.tsx`, `app/(app)/chapters/[slug]/page.tsx`) so every date-driven number on a
  page agrees with the same clock.
- `supabase/seed.sql` rewritten: chapters are now `2026-08` / `2026-09` / `2026-10` (August /
  September / October 2026 — the relationship's first three monthsaries), titled with the date
  itself (`"August 2026"`) instead of a narrative phrase (`"Where It Began"`). No chapter predates
  `relationship.started_at` (2026-07-05) any more. Memories redated to fall within the new
  timeline.
- Updated `docs/agent/codebase-map/reading-experience.md` to describe the shipped model (the
  monthsary-count section from the previous log entry was rewritten in place, since codebase-map
  docs are living, not append-only).

## Verified

- `npx tsc --noEmit`, `npx eslint .` clean.
- Worked through the corrected timeline by hand (script run outside the repo, not committed):
  at real "today" (2026-07-27), elapsed monthsaries = 0, shelf empty. At the dev anchor
  (2026-08-05), elapsed = 1, exactly "August 2026" unlocks. At 2026-09-05, elapsed = 2, adds
  "September 2026". At 2026-10-05, elapsed = 3, all three. Boundary days (Aug 4 vs Aug 5, Sep 4 vs
  Sep 5) land on the correct side.

## Notes for next session

- The dev-clock default (2026-08-05) is a moving target only in the sense that it's a fixed point
  — it never needs to be "reverted", since it's inert in production. If a session needs to preview
  further into the future, use `DEV_NOW` rather than editing `devClock.ts`.
- If a real backstory chapter (dated before `started_at`) is ever wanted, it does not fit this
  model as built — it would need to be explicitly exempted from the monthsary count rather than
  competing for a rank slot, which is a real design decision, not a bug fix.
