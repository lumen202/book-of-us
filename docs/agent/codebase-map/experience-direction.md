# Experience Direction + Interaction Choreography

This subsystem defines the UX guardrails for "The Book of Us" so future changes do not regress
back into generic software patterns.

## North star

Design for one person. Every interaction should communicate thoughtfulness, memory, and care.
The visitor should feel guided through moments, not asked to operate a UI.

## Practical constraints

- Keep existing product systems intact (auth, chapters/memories queries, storage signatures,
  celebration detection). Art direction is layered on top of working behavior.
- Prefer emotional pacing to feature density: reveal in beats, not everything at once.
- One primary next action per major section when practical.
- "Software language" should be translated into "story language" where possible:
  - "Open chapter" > "View"
  - "Lift this memory" > "Open card"
  - "Fold this memory" > "Close modal"

## The visit's shape

The desired arc (arrival → invitation → first message → the world appears → exploration →
emotional centre → reflection → looking forward) is implemented as:

| Beat | Where |
|---|---|
| Arrival — empty, ambient, nothing asked | `arriving` stage in both opening scenes |
| Invitation — one object | envelope / wax-sealed letter |
| First message — one line at a time | `WhisperSequence` + `whispers.ts` |
| The world appears | `HomeCover`'s two-signal cross-dissolve (see `opening-sequence.md`) |
| Exploration | chapter shelf → album page → lifted print |
| Reflection + looking forward | `components/story/ClosingReflection.tsx` |

`ClosingReflection` ends every page: a lot of empty space and one quiet line, then the next
chapter's date. **It deliberately has no call to action** — if a button ends up in it, the
reflection beat is gone. `lib/relationship/nextChapter.ts` computes the date (and returns
*today* on the 5th rather than jumping a month ahead).

## Current implementation surfaces

- `app/(app)/page.tsx`
  - Home now frames chapters as a guided shelf with intro copy and reduced choice overload.
- `components/chapter/ChapterCover.tsx`
  - Chapter links styled as tactile chapter strips with subtle lift/tilt and one clear progression cue.
- `app/(app)/chapters/[slug]/page.tsx`
  - Chapter landing introduces memory context before presenting content.
- `components/memory/MemoryGrid.tsx` / `MemoryCard.tsx`
  - A chapter is a photo album page: prints on album paper, corner mounts, deterministic
    tilt, captions underneath. See `reading-experience.md`.
- `components/memory/MemoryComposer.tsx`
  - Adding a photo appears as an empty slot on the page, not an upload button, and asks for
    two things at most (files + optional caption). Metadata fields are the thing to resist
    here.
- `components/memory/MemoryDetail.tsx`
  - Detail reveal animates in as a focused moment, not a hard-cut utility dialog.
- `app/globals.css`
  - Ambient light gradients and drift motion provide atmosphere while preserving readability.

## Celebration (5th) guidance

Celebration mode should alter atmosphere and pacing as a distinct event, not only tint colors.
Opening sequence already branches into gift behavior; future chapter/memory layers should continue
that pattern.

## Review checklist for future UI changes

Ask before merging:

1. Does this feel handcrafted rather than templated?
2. Would the first 30 seconds feel like exploration, not button-clicking?
3. Is there a meaningful reveal arc on this screen?
4. Did we preserve reduced-motion semantics without flattening the emotional structure?
5. Did we avoid touching stable product logic just to achieve styling?
