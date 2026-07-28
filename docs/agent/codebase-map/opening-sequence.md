# Cinematic Opening

> **Rebuilt 2026-07-28.** There is now **one** scene (`MonthsaryOpening`), it is staged inside the
> real `StorybookSky` rather than its own scenery, and it has a look-back slideshow beat. Read
> [`celebration-mode.md`](celebration-mode.md) alongside this. `EnvelopeOpening` and `GiftOpening`
> are both gone; sections below describing them are historical.

Not a random pool of ambient fade-ins. A small, deliberate set of tactile moments by context —
she has to *do* something (click/tap an object) to open the book, not just watch text
animate in. See `log/2026-07-27-creative-direction-reset.md` for why this replaced an
earlier weighted-random-scene-pool approach entirely (that approach is gone, not layered
under this one).

## Files

- `lib/opening-sequence/types.ts` — `OpeningSceneProps` shared by both scenes: `title`,
  `subtitle`, `reducedMotion`, `celebrationLabel`/`celebrationMessage` (only rendered by
  the celebration scene), `onIntroComplete`.
- `lib/opening-sequence/whispers.ts` — the first-message copy, one short line per entry.
  One sentence, one breath; if a line needs a comma splice to fit, it's two lines.
- `lib/opening-sequence/WhisperSequence.tsx` — delivers those lines one at a time (fade in,
  hold, fade out, next) so the first message lands as speech with pauses rather than a
  paragraph. Guards against double-advance with a `scheduledFrom` ref, because
  `onAnimationComplete` fires for exits too and an exiting line still holds its old index.
- `lib/opening-sequence/sequences/EnvelopeOpening.tsx` — the everyday scene. Six beats,
  chained via Framer Motion's `onAnimationComplete` (never `setTimeout`+`useEffect` for
  sequencing — see below): `arriving` (empty — nothing but breathing light, nothing asked
  of her) → `sealed` (the envelope appears and waits) → `breaking` (seal snaps) → `opening`
  (flap lifts, light blooms behind it) → `whisper` (the first message, via
  `WhisperSequence` — this is the point of the scene, everything before it is buildup) →
  `revealed` (title settles into the light, then a hold before `onIntroComplete`). A quiet
  "Skip" sits top-right from `sealed` onward.
- `lib/opening-sequence/sequences/GiftOpening.tsx` — Celebration Mode's scene (see
  `celebration-mode.md`). A wrapped gift variant with distinct physical beats:
  `wrapped` → `untying` (bow comes off) → `lifting` (lid lifts, warmer/wider light bloom)
  → `revealed`.
- `lib/opening-sequence/sequences/MonthsaryOpening.tsx` — dedicated monthsary opening (5th).
  A romantic keepsake ritual: `arriving` (same empty hush as the envelope — on the one day
  that's meant to feel different, she should notice the atmosphere before she's handed
  something to do) → `sealed` (break the wax seal) → `petals` → `letter` (unfolds) →
  `revealed`. **"Happy Nth Monthsary" is the headline of this scene** — set large serif with
  a soft glow, with the book's own title stepped down to a byline underneath it. On the 5th
  the occasion outranks the product name; don't quietly demote it back to a tracking-wide
  label.
- `lib/opening-sequence/OpeningSequence.tsx` — orchestrator. Picks
  `celebrating && celebrationLabel ? MonthsaryOpening : celebrating ? GiftOpening : EnvelopeOpening`
  (from `useCelebrating()`, see `celebration-mode.md`), wraps the chosen scene in
  `AnimatePresence`, and emits **two** signals: `onIntroComplete` (the story is over, start
  revealing the page) and `onComplete` (the overlay has finished fading, it can unmount).

## The handoff into the page

`components/home/HomeCover.tsx` mounts the world on `onIntroComplete`, while the opening is
still dissolving on top of it, and only unmounts the opening on `onComplete`. The page
therefore appears *through* the letter (opacity + a 1.035→1 scale settle + a blur that clears
over ~2.2s) instead of replacing it. Swapping on one signal alone is what makes an intro feel
like a loading screen — don't collapse these back into one.

The reveal wrapper drops its `filter`/`transform` entirely once settled: a lingering
`blur(0px)` still establishes a containing block, which would silently re-anchor any
`position: fixed` descendant.

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

- No randomization. Scene selection is deterministic by context (everyday vs celebration
  fallback vs monthsary) so the opening always feels intentional.
- The envelope/box art is plain CSS shapes (`clip-path`, absolutely-positioned divs), not
  illustration or Lottie. Swappable later if it's worth the asset investment; not blocking
  now.
