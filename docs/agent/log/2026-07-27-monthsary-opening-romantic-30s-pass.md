# 2026-07-27 — Monthsary opening romantic 30s pass

## Why

The first monthsary scene worked but finished too quickly to feel like a full emotional moment.
Request was to make it overtly romantic with longer pacing.

## Shipped

- Reworked `lib/opening-sequence/sequences/MonthsaryOpening.tsx` into a 5-beat arc:
  - `night` (tap moon)
  - `sunrise` (slow dawn bloom)
  - `constellation` (heart constellation forms)
  - `polaroid` (memory develops)
  - `revealed` (dedication + monthsary line)
- Increased non-reduced-motion total runtime to roughly 28-30 seconds (including end hold), while
  keeping reduced-motion flow short and respectful.
- Added romantic fallback line when no message is provided.

## Notes for next session

- If this feels too long in real usage, shorten just `photoDevelopDuration` first before changing
  the rest of the arc.
