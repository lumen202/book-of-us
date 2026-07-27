# Design Tokens + Theming

Hand-painted storybook palette (Ghibli register, not editorial romance): cream paper, warm brown
ink, a cool accent and a warm one, plus a season layer. Read the doc comment on `baseTokens` in
`lib/theme/tokens.ts` before changing any colour — it states the rules, and the palette has
already drifted cold once.

The three rules, in short:

1. **No true black, no true grey.** Every neutral carries yellow. A desaturated hex is the tell.
2. **Nothing darker than the ink.** Backgrounds stay light in every mode.
3. **Two accents, always both.** `accent` is the cool one (meadow/sky/water), `accentWarm` is the
   sunlight. Dropping the warm one is what makes it read as cold.

## There is a second, scene-only palette

`gardenTokens` in `lib/theme/tokens.ts` adds six pigments used **only** by the ambient backdrop:
`leaf`, `leafDeep`, `blossom`, `lilac`, `butter`, `sky`. They exist because the four base tokens
cannot reach green, pink, lavender or butter yellow — teal mixed toward apricot is
near-complementary and lands on khaki, which is how the backdrop ended up olive and melancholy
once. Read the comment on `gardenTokens` before touching them.

**Do not use them for UI.** Buttons, borders, cards and type stay on `baseTokens`; that
separation is what keeps the painted world from leaking into the interface. See
[`painted-world.md`](painted-world.md).

## Seasons are Philippine, not temperate

The book is read in the Philippines. `Season` is `amihan` (Nov–Feb, cool dry) | `tag-init`
(Mar–May, hot dry) | `tag-ulan` (Jun–Oct, rainy) — **not** winter/spring/summer/autumn. A
"winter" palette in Manila never matches what's outside the window. Seasons override the accents
and the two leaf pigments (how green the year is), never the neutrals and never the blossom
colours — the flowers are what make the backdrop feel like one particular place.

## Celebration Mode has no palette

There is deliberately **no** `celebrationTokens` and **no** `:root[data-celebration]` colour
block. A tinted celebration palette existed and was removed: it made the site look like a
different site rather than like a special day. The 5th distinguishes itself through the opening
ceremony and its illustrated scene (see `opening-sequence.md`), not through colour.

`data-celebration` is still set on `<html>` by `CelebrationProvider`, so *behaviour* can branch
on it — just not colour.

## Files

- `lib/theme/tokens.ts` — source of truth for token values as plain TS objects (no CSS/JSX here,
  so the values are testable and reusable outside a component tree): `baseTokens.color`,
  `seasonAccents`, `CURRENT_SEASON`.
- `CURRENT_SEASON` is set by hand, not computed from today's date — an earlier version had a
  pure `getSeason(date?)` mapping months to seasons, called both server-side in `app/layout.tsx`
  and client-side in a now-deleted `ThemeProvider` (so a tab left open across a season boundary
  would still update). Removed because nobody wanted the season changing itself; whoever owns the
  book edits `CURRENT_SEASON` directly when the season actually changes.
- `app/layout.tsx` — sets `data-season={CURRENT_SEASON}` on `<html>` directly, server-side only.
  Also loads Cormorant Garamond (serif, titles) and Manrope (sans, body) via `next/font/google`.
- `app/globals.css` — `:root` defines the base custom properties; `:root[data-season="X"]`
  overrides just the accents. The Tailwind v4 `@theme inline` block registers them as utilities
  (`bg-background`, `text-ink`, `bg-accent`, …) and also defines `--radius-card`,
  `--radius-panel`, and `--ease-bounce`. No `tailwind.config.ts` — Tailwind v4 is CSS-first, so
  this file is the only place token names are registered.
- `app/globals.css` also holds the **keyframes for the ambient scene** (`cloud-drift`,
  `cloud-bob`, `bird-fly`, `bird-flap`, `wing-beat`, `wing-rest`, `sky-warm`, `sun-breathe`,
  `ray-breathe`, `tuft-sway`, `bough-sway`, `swing-rest`, `mote-rise`, `life-cross`,
  `life-wander`, `petal-flutter`, `firefly-blink`, `sparkle-twinkle`). They live here because
  several elements share them at different durations, and because the `prefers-reduced-motion`
  block at the bottom of the file kills every one of them at once via `[class*="ambient-"]`.

## The painted background

See [`painted-world.md`](painted-world.md) — it is a large enough subsystem to have its own file.
Short version: `components/ambient/StorybookSky.tsx` at `-z-10`, generated geometry only (no
image assets), every colour a `color-mix()` of base tokens plus `gardenTokens`.

## Shape and motion

Rounder and bouncier than a typical app, on purpose: large radii (`rounded-2xl` / `rounded-[2rem]`),
soft warm shadows, and `ease-(--ease-bounce)` for things that should feel alive as they arrive.
Every hover transform has a `motion-reduce:` counterpart.

## Not yet built

- **Per-chapter atmosphere** (`chapters.atmosphere` jsonb → inline style overrides scoped to a
  chapter page).

## Gotcha for later sessions

There is deliberately no light/dark mode toggle and no `prefers-color-scheme` branch — the
product calls for one consistent warm palette, not a generic dark mode. If dark mode is ever
requested, it's a deliberate new decision, not a bug fix.
