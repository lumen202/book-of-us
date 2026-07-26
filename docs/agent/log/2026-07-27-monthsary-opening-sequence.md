# 2026-07-27 — Monthsary opening sequence

## Why

Celebration mode had a nice gift animation, but the monthsary moment needed a clearer emotional
signature so the 5th feels like its own event, not only a generic celebration variant.

## Shipped

- Added `lib/opening-sequence/sequences/MonthsaryOpening.tsx`.
  - Scene arc: `night` -> `transition` -> `revealed`.
  - Interaction: tap moon to begin the transformation.
  - Mood shift: quiet night palette into warm dawn light before title/message reveal.
- Exported the new scene from `lib/opening-sequence/sequences/index.ts`.
- Updated `lib/opening-sequence/OpeningSequence.tsx` to route celebration sessions with a
  monthsary label to `MonthsaryOpening`.
- Updated opening sequence docs to reflect deterministic multi-scene selection.

## Notes for next session

- Consider syncing ambient sound cues to this scene (very subtle) as a separate layer.
- If chapter/memory pages gain monthsary-specific atmosphere, keep the transition consistent with
  the dawn motif introduced here.
