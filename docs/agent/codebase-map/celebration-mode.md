# Celebration Mode (the 5th)

On the 5th of every month the garden is at **night** and the shelf is preceded by a ceremony.
`isCelebrationDay()` is the whole test; `CelebrationProvider` puts `data-celebration` on `<html>`
from the client hook, and everything below hangs off that one attribute.

## The palette invariant this deliberately overrides

`lib/theme/tokens.ts` says *"nothing darker than the ink — backgrounds stay light in every mode,
including Celebration; the 5th is a sunrise, not a night scene."* **That is no longer true, and it
was overridden knowingly** (2026-07-28, at the owner's direction) to get lanterns, stars, a moon
and fireworks. The rule was written about the *everyday* backdrop, where the risk being guarded
against was melancholy; a monthsary evening with the lanterns lit is not melancholy. The rest of
the palette rules still hold — no true grey, no black, every neutral carries a hue.

## How the world goes dark: one token

`--color-scene-paper` (in `:root`, defaulting to `--color-background`) is the colour the world's
air dilutes into. `lib/ambient/palette.ts` mixes the sky, the far air, distance, pale grass and
the path through it, so **moving that single value re-derives the entire scene's light together.**
The `data-celebration` block in `globals.css` sets it to deep indigo, along with `--color-sky`,
the two leaf greens, `--color-butter` and the two flower pigments.

This is why there is no night wash laid over the scene and no second palette: a wash tints
everything uniformly, which is what "recoloured" looks like. Re-deriving is what "a different time
of day" looks like.

**The UI tokens are not in that block, and must not be added to it.** `--color-background`,
`--color-surface`, `--color-ink` and the accents stay exactly where they are, so every card, modal
and album page is unchanged cream paper — now lit against a dark garden.

## Text legibility at night: two cases, opposite fixes

Adding anything that sits over the scene means picking one of these:

| Situation | Class | What happens on the 5th |
|---|---|---|
| Type on the bare sky (header, hero lines, closing reflection) | `.ink-legible` | Letterforms go pale, halo goes dark |
| Type on a translucent card (chapter covers) | `.scene-card` | The card opacifies; ink stays dark on light paper |

Getting this wrong is what makes the night build look broken — `bg-surface/55` over indigo is a
muddy midtone that neither dark nor light type sits on. Both rules are in `globals.css` next to
the palette block.

## What else the attribute drives

- `.lantern-flame` in `HillRange` — the fence lanterns, dark all month, finally lit. The
  painted-world doc calls an unlit lantern "a promise about the evening"; this is the promise kept.
- `NightSky.tsx` — seeded stars and a soft full moon, `opacity: 0` until the 5th.
- `.ambient-sun` / `.ambient-sun-wide` / `.ambient-ray` — faded out; the sun is down.

All of these are **rendered always and revealed by CSS**, never conditionally mounted. Whether
today is a celebration is a client-only question (the dev override lives in localStorage), so a
conditional render would hydrate differently than it server-rendered.

## The ceremony

`lib/opening-sequence/` — see [`opening-sequence.md`](opening-sequence.md). One scene now
(`MonthsaryOpening`), staged **inside the real garden**: the overlay has no background, the app's
own `StorybookSky` shows through it, and `HomeCover` veils the shelf rather than covering the
world. Beats: `arriving` → `sealed` → `letter` → `review` → `whisper` → `revealed`.

The `letter` beat shows the couple's own letter if they've saved one in Settings
(`app/(app)/settings/page.tsx` → `LoveLetterEditor`, stored at `relationship.settings.loveLetter`,
read via `getLoveLetter()` in `lib/relationship/queries.ts`), falling back to the two hardcoded
defaults in `MonthsaryOpening.tsx` otherwise. The `whisper` beat works the same way, one step
down: `WhisperEditor` saves a flat list of lines to `relationship.settings.whisperLines`
(`getWhisperLines()`), overriding `monthsaryWhispers()`'s two hardcoded sets (`whispers.ts`) when
present. Neither has an admin gate — same "either account edits everything" model as the rest of
the app (`lib/auth/admin.ts`).

`review` is the look back — **last** month's photographs, one at a time, as mounted album prints
(`art/MonthInReview.tsx`), never the current calendar month's even though it's already on the
shelf (chapters are created and revealed on the 1st now — see
`codebase-map/reading-experience.md` — so the current month may already hold a few days of photos
by the 5th; `findLookBackPrints` in `lib/memories/queries.ts` explicitly excludes it so those can't
leak into the celebration for the month that just finished). `revealed` fires one heart firework
(`art/HeartFirework.tsx`) on the greeting. One, not a volley — see that file for why.

## Previewing it on any other day

The **"Play the ceremony"** button, bottom-right, shown to the admin (`isCurrentUserAdmin`, passed
down from the app layout) and in dev. It clears the "already seen" flag and navigates to
`/?celebrate=1`.

**The query param matters and localStorage alone is not enough.** The look-back photographs are
fetched during the page's server render, so the *server* has to know a preview is happening.
Flipping only the localStorage override turns the ceremony on client-side while the server, still
believing it is an ordinary day, sends no photographs — and the look-back beat skips itself
silently, which looks exactly like the feature not existing. This cost a debugging round; don't
reintroduce it.

**Previewing also disables the current-month exclusion.** `findLookBackPrints` normally refuses to
look back at the current calendar month (see `reading-experience.md`) so a real celebration can't
show an in-progress month as if it were the finished one. But the preview button is used precisely
*before* a real "last month" exists — its whole purpose is showing photos just added to the
current month — so `app/(app)/page.tsx` passes `excludeCurrentMonth: !previewing`, turning that
protection off only for the manual preview path.
