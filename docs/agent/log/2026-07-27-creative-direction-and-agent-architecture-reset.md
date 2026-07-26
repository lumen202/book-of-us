# 2026-07-27 — Creative direction reset + agent architecture update

## Why

The app was functionally correct but still read like software in key post-intro surfaces
(home/chapters/memories). The goal was to preserve working systems while shifting the experience
into a slower, tactile, memory-first narrative.

## Shipped

- Experience layer refresh (no backend/system rewrites):
  - Updated typography stack in root layout (`Cormorant Garamond` + `Manrope`) and global
    atmosphere gradients/motion in `app/globals.css`.
  - Reframed app header copy and tone to reduce utilitarian navigation language.
  - Reworked home screen from chapter grid into a guided chapter shelf with narrative pacing.
  - Restyled chapter links as tactile strips with a single progression cue.
  - Reframed chapter page intro copy to set memory context before browsing.
  - Reworked memory list/cards/detail into keepsake-like interactions with slower reveal motion.
  - Added subtle tactile prompt text in both opening scenes (`Tap the seal`, `Untie the ribbon`).

- Agent architecture/docs alignment:
  - Added `docs/agent/codebase-map/experience-direction.md` with durable UX guardrails.
  - Updated `docs/agent/codebase-map/INDEX.md` to include the new subsystem and mark
    `opening-sequence.md` as current.
  - Updated `AGENTS.md` with "Experience Direction Invariants" so future sessions preserve
    this intent.

## Notes for next session

- Celebration mode currently branches at opening sequence and token level; chapter/memory surfaces
  can further branch atmosphere on the 5th for stronger event feel.
- If cinematic motion is expanded, verify reduced-motion alternatives keep semantic pacing.
- Validate on real content density (many chapters/memories) to tune rhythm and avoid visual noise.
