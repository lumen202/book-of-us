# Celebration Mode rebuilt: night garden, look-back slideshow, heart firework

The 5th's opening was reported as "still the old one, too plain, doesn't match the aesthetic".
The diagnosis was structural, not cosmetic, and the rebuild went further than planned because the
owner made two direction calls mid-session.

## What was actually wrong

The ceremony was an **opaque overlay carrying its own painted world**. `MonthsaryScenery` drew
clouds as four ellipses, hills as three flat beziers and the sun as a circle — art from before the
painted-world rebuild, never brought forward. So the intro looked like a flatter, older app than
the book it opened into. Every colour in the sequence was also a hardcoded hex, so it shared not
one token with the world it handed off to.

Fixed by deleting the private scenery outright. The overlay now has **no background**; the app's
own `StorybookSky` shows through it and `HomeCover` veils the *shelf* instead (opacity +
`visibility`, so it still server-renders and still fades up as the reveal). Nothing is painted
twice, and the handoff stopped being world A → world B.

## Direction calls made by the owner this session

1. **"The whole 5th is evening"**, chosen over "the ceremony sets, the day stays golden". This
   **knowingly overrides** the `lib/theme/tokens.ts` rule that backgrounds stay light in every mode
   including Celebration. Recorded in `celebration-mode.md` so nobody "fixes" it back.
2. **One heart firework, at the greeting** — not a volley. See `art/HeartFirework.tsx` for the
   reasoning; it is the loudest thing in the project and had to stay a full stop rather than
   applause.

Golden hour was built first and then replaced by night; the golden-hour palette is gone, not
layered underneath.

## How the world goes dark: one token

New `--color-scene-paper`, defaulting to `--color-background`. `palette.ts`'s `T.paper` reads it,
and since the sky, far air, distance, pale grass and path all dilute through it, **moving that one
value re-derives the entire scene's light together** — no wash, no second palette. The
`data-celebration` block moves it plus `--color-sky`, both leaf greens, `--color-butter` and the
flower pigments.

The **UI tokens are deliberately not in that block**. Cards, modals and album pages stay cream
paper, now lit against a dark garden.

Also on the attribute: `.lantern-flame` (the fence lanterns finally lit — the painted-world doc's
"promise about the evening", kept), `NightSky.tsx` (seeded stars + a soft full moon), and the sun
and its light shafts faded out. All rendered always and revealed by CSS, never conditionally
mounted, because "is it a celebration" is a client-only question and a conditional render would
hydrate differently.

## Night legibility — two cases, opposite fixes

This took three rounds of user screenshots to fully sweep, which is worth recording:

- **Type on the bare sky** → `.ink-legible`, which now inverts under celebration (pale letterforms,
  dark halo). Had to be *added* to `AppHeader`, the chapter page header, the archive, the loading
  state and all of the ceremony's own text — none of which carried it, because on a cream page they
  never needed it.
- **Type on a translucent card** → new `.scene-card`, which opacifies instead. `bg-surface/55` over
  indigo is a muddy midtone that neither dark nor light type sits on. `ChapterCover` moved from the
  first treatment to the second.

The greeting's `<h1>` carries its shadow inline, so that inline value had to absorb both jobs — the
warm bloom *and* the dark halo — since it beats the class.

## The look back

`art/MonthInReview.tsx`, a new `review` beat between the letter and the whisper: this month's
photographs, one at a time, as mounted album prints with photo corners and deterministic tilts.
No dots, no arrows, no swipe — it plays. `findLookBackPrints` falls back to the most recent month
that *has* photos (bounded to 4 chapters), because the beat vanishing in quiet months is exactly
backwards.

**Two bugs found by the user reporting "I still don't see the slideshow", both worth remembering:**

1. The photos are fetched during the page's *server* render, gated on `isCelebrationDay()`. The
   preview override lives in localStorage, which the server cannot see — so `?celebrate=1` played
   the ceremony while the server sent no photographs and the beat skipped itself silently. The page
   now also reads the `celebrate` query param.
2. `CelebrationDevToggle` was `NODE_ENV === "development"` only, so the one thing it exists for —
   testing on a real phone against the deployment — was the one thing it could not do. It is now
   shown to the admin (`isCurrentUserAdmin`, resolved in the app layout) and gained a **"Play the
   ceremony"** button that clears the seen-flag and hard-navigates to `/?celebrate=1`. It must be a
   navigation, not `router.push` + a flag, for reason (1).

## Also

`GiftOpening` deleted rather than rebuilt — it could only appear when there was no relationship row,
it was the plainest art in the project, and `MonthsaryOpening` already falls back to a generic
"Happy Monthsary". One ceremony, kept good.

## Copy pass

Reported as feeling mechanical, and the specific tell was that the first monthsary said "Thank you
for another month" and "Same love, new month" — false when there has been no other month yet.

Copy now branches on `monthsaryNumber`, plumbed page → `HomeCover` → `OpeningSequence` → scene:

- `whispers.ts` exports `monthsaryWhispers(n)` instead of a constant. The old lines ("It's the 5th
  again.") announced the date, which the greeting already says — the new later-month set is about
  having kept things instead. Month one gets its own set about none of this having existed.
- `lib/celebration/messages.ts` splits into `firstMonthsaryMessages` / `monthsaryMessages`;
  `pickMonthsaryMessage(n)`.
- The letter body is chosen in `MonthsaryOpening` on the same flag.

It then took two more passes to find the register, both worth recording because each failure is a
different trap:

1. **Greeting-card** ("little moments that became everything") — assembled from things people say
   *about* relationships rather than anything one person writes to another.
2. **Over-corrected dry** ("I didn't set out to make a book. I just kept not wanting to lose any of
   it.") — accurate, restrained, and not remotely romantic. Dryness is not the opposite of
   sentimentality; it is another way of not saying anything.

What works is the register two people who like each other use in private: affectionate, specific,
teasing. **A joke is what earns the sincere line next to it** — warmth on its own reads as a card,
warmth after a joke reads as someone who means it and is embarrassed about it. Two constraints,
written into `MonthsaryOpening`: the joke is at the writer's expense, never hers; and it is **not
about photographs** (a "my camera roll is a disaster" version was rejected — it makes the letter
about documenting rather than about her, and the photos speak for themselves in the very next
beat).

The whispers were rewritten to the same register, both sets on a tease → beat → sincere shape, with
the shortest line last so the greeting has a gap to fall into.

**Their own names went in, and that turned out to matter more than any of the writing.** A private
name is proof something was written for one specific person, and no amount of good general copy
fakes it. The set: "dai" (her, everyday), "kuya"/"ya" (him, everyday), and "my habibi" / "scammer"
/ "uwagan" (playful). Address settled on **"my habibi"** over the everyday "dai" at the owner's
call — "dai" is accurate but neutral and lets a line sit flat, where "my habibi" arrives already
carrying the joke and the affection together. `whispers.ts` documents which name goes on which kind
of line and flags both arrays as the first thing to rewrite if this is ever reused.

There was also **no "I love you" anywhere**, which is a strange hole in a monthsary ceremony. It is
now the last whisper, alone, immediately before the greeting — after three joking lines the
plainest sentence available is the one that lands. The letter deliberately does *not* also say it
(it signs off "Yours, obviously —"); saying it twice within five minutes spends it.

One deliberate exception: the first-month letter says **"I've built you an entire website"** — the
only place in the app that breaks the book metaphor. Chosen over "a whole book about us" because
the joke needs the gesture to be literal: "I made you a book" lands as a metaphor, "I built you a
website" lands as an admission, and the admission is the beat. Every recurring letter keeps the
metaphor ("a bigger book"). Don't propagate the break.

Also `SideFireworks` — small, dim, edge-only bursts on unsynced repeats, running for as long as the
greeting is on screen. The heart is a full stop and fires once; without these the sky went
completely dead while someone was still sitting there. Kept in the outer fifth so nothing ever
bursts behind the words, and not rendered at all under reduced motion (unlike the heart, which
still arrives formed because it is punctuation).

Dropped "· Joshua & Liezel" from the greeting byline — title plus two names in spaced caps read as
a wedding invitation.

## Not verified

Nothing here has been seen on the deployed build or a real phone yet — that is what the new admin
button is for. Worth checking specifically: contrast of every `.ink-legible` surface at night, and
whether the night scene's extra star nodes cost anything on Android given the compositing work
earlier in the day.
