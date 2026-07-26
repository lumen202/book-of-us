# 2026-07-27 — Monthsary non-literal romantic + theme pass

## Why

The previous monthsary sequence used a literal moon motif that did not match the desired tone.
Request was to make it feel romantic without obvious symbolism, and to shift the app theme toward
more romantic colors.

## Shipped

- Replaced monthsary opening metaphor with a keepsake ritual in
  `lib/opening-sequence/sequences/MonthsaryOpening.tsx`:
  - wax-sealed letter CTA
  - petal drift beat
  - unfolding handwritten-letter beat
  - final dedication reveal
- Kept long cinematic pacing while preserving reduced-motion behavior.
- Updated theme palette in `lib/theme/tokens.ts` and `app/globals.css`:
  - blush/champagne base neutrals
  - rose-forward accents
  - romantic celebration override colors
  - adjusted ambient body gradients to match the new palette
- Synced codebase-map docs for opening sequence and theming.

## Notes for next session

- If additional romance is needed, consider subtle paper-grain texture and very soft audio as
  optional layers gated by user preference.
