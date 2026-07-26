# Cinematic Opening

Not a random pool of ambient fade-ins. A single deliberate, tactile moment per mode —
she has to *do* something (click/tap an object) to open the book, not just watch text
animate in. See `log/2026-07-27-creative-direction-reset.md` for why this replaced an
earlier weighted-random-scene-pool approach entirely (that approach is gone, not layered
under this one).

## Files

- `lib/opening-sequence/types.ts` — `OpeningSceneProps` shared by both scenes: `title`,
  `subtitle`, `reducedMotion`, `celebrationLabel`/`celebrationMessage` (only rendered by
  the celebration scene), `onIntroComplete`.
- `lib/opening-sequence/sequences/EnvelopeOpening.tsx` — the everyday scene. A sealed
  envelope (wax seal monogrammed "J&L") she clicks. Four beats, chained via Framer
  Motion's `onAnimationComplete` (never `setTimeout`+`useEffect` for sequencing — see
  below): `sealed` (idle, interactive) → `breaking` (seal snaps) → `opening` (flap lifts,
  light blooms behind it) → `revealed` (title settles into the light, then a hold before
  `onIntroComplete`).
- `lib/opening-sequence/sequences/GiftOpening.tsx` — Celebration Mode's scene (see
  `celebration-mode.md`). Same four-beat shape, different object and physical action so it
  reads as its own occasion, not a recolor: `wrapped` → `untying` (bow comes off) →
  `lifting` (lid lifts, warmer/wider light bloom) → `revealed` (monthsary label + title +
  a rotating romantic line from `lib/celebration/messages.ts`).
- `lib/opening-sequence/OpeningSequence.tsx` — orchestrator. Picks
  `celebrating ? GiftOpening : EnvelopeOpening` (from `useCelebrating()`,
  see `celebration-mode.md`), wraps the chosen scene in `AnimatePresence` so its `exit`
  fade plays before `onComplete` fires (the caller then reveals the real page — see
  `components/home/HomeCover.tsx`).

## Two things that look like bugs but aren't

1. **Sequencing uses `onAnimationComplete`, not `useEffect` timers.** Each scene's stage
   machine (`sealed`/`wrapped` → ... → `revealed`) advances only from a Framer Motion
   animation's completion callback. This isn't a style preference — an effect-based
   `setTimeout` chain would drift out of sync with the actual animation durations, and
   `eslint-config-next`'s `react-hooks/set-state-in-effect` rule would flag every step of
   it. `onAnimationComplete` is a plain callback prop, not an effect, so neither problem
   applies.
2. **`OpeningSequence` gates everything behind a `mounted` flag** set in a `useEffect`
   (with a lint-disable comment justifying it). `celebrating` depends on a client-only
   override (query param / localStorage — see `celebration-mode.md`) the server can't see.
   Rendering a scene immediately based on it would hydrate differently than the SSR
   output. Rendering nothing until after mount keeps SSR and the client's pre-effect
   render identical, then the real scene appears in one deliberate post-hydration render.
   This is the standard "client-only conditional render" pattern — the lint rule's
   objection to `setState`-in-effect doesn't have a version of this without an effect.

## Deliberately not done

- No third+ scene variants, no randomization. Quality over variety was an explicit
  creative-direction call, not a scope cut — see the log entry above.
- The envelope/box art is plain CSS shapes (`clip-path`, absolutely-positioned divs), not
  illustration or Lottie. Swappable later if it's worth the asset investment; not blocking
  now.
