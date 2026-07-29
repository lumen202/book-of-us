# 2026-07-29 — Preview button broke under the current-month look-back exclusion

Follow-up to
[`2026-07-29-auto-chapter-creation-decoupled-from-celebration.md`](2026-07-29-auto-chapter-creation-decoupled-from-celebration.md)
from earlier the same day, caught by the user before the fix above had been used at all.

## Why

That entry's fix made `findLookBackPrints` always skip whatever chapter matches the current
calendar month, to stop a real celebration from showing an in-progress month as if it were the
finished one. But the admin's "Play the ceremony" preview button (`celebration-mode.md`) is used on
*any* day, usually well before a real "last month" with photos exists — its entire purpose is
seeing photos just added to the current, in-progress month while testing. Under the blanket
exclusion, previewing before the 5th would either show nothing or an older, already-seen month
instead of what was actually just added — silently defeating the button, same failure shape as the
query-param bug documented in `celebration-mode.md`.

## Shipped

- `lib/memories/queries.ts`: `findLookBackPrints`'s third parameter is now an options object,
  `{ now, excludeCurrentMonth = true }`, instead of a bare `now: Date`. Exclusion still defaults on
  (safe for the real automatic celebration).
- `app/(app)/page.tsx`: passes `excludeCurrentMonth: !previewing` — off during preview, on for the
  real thing.
- `reading-experience.md` / `celebration-mode.md` updated in place to document both the exclusion
  and this exception.

## Verified

- `npx tsc --noEmit` clean.

## Notes for next session

- The distinction to hold onto: the exclusion protects the *automatic* 5th-of-the-month celebration
  from leaking an unfinished month. It was never meant to constrain a human deliberately asking to
  preview whatever exists right now — those are different problems and should keep being solved
  independently if this area changes again.
