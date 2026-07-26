# Design Tokens + Theming

Base warm "quiet luxury" palette (parchment background, ink text, single gold accent) plus a
season layer. Celebration Mode (5th of every month) and per-chapter atmosphere are separate,
not-yet-built layers that will extend this same pattern — see `celebration-mode.md` when it
exists.

## Files

- `lib/theme/tokens.ts` — source of truth for token values as plain TS objects (no CSS/JSX here,
  so the values are testable and reusable outside a component tree):
  - `baseTokens.color` — the neutral palette (background/surface/ink/border) that never changes
    across seasons.
  - `seasonAccents` — per-`Season` overrides of just `accent`/`accentMuted`. Seasons only ever
    touch the accent, never the neutrals, so the book's mood shifts without the base feeling
    different app to app.
  - `getSeason(date?)` — pure function, meteorological Northern-hemisphere seasons from a month
    number. Defaults to `new Date()` but takes a `date` param so it's unit-testable and so
    Celebration Mode / a future "force a date for QA" override can call it deterministically.
- `lib/theme/ThemeProvider.tsx` — client component, no visual output (`<>{children}</>`). Sets
  `document.documentElement.dataset.season` in a `useEffect`. Deliberately a client effect rather
  than only a server computation: the intent (per the build plan) is for `data-celebration` to
  be added here later and flip mid-session if a tab is left open across midnight on the 5th —
  `data-season` is built the same way now so both attributes share one mechanism.
- `app/layout.tsx` — also sets `data-season` on `<html>` directly at render time (server-side,
  via the same `getSeason()`) so there's a correct value on first paint before the client effect
  runs; the effect is a same-value no-op in the common case.
- `app/globals.css` — `:root` defines the base CSS custom properties; `:root[data-season="X"]`
  blocks override just `--color-accent` / `--color-accent-muted`. A Tailwind v4 `@theme inline`
  block maps these to `bg-background`, `text-ink`, `text-ink-muted`, `bg-accent`, `border-border`,
  etc., plus `--font-serif` (Fraunces) / `--font-sans` (Inter). No `tailwind.config.ts` — Tailwind
  v4 is CSS-first, so this file is the only place token names are registered.
- `app/layout.tsx` — Fraunces (serif, titles) and Inter (sans, body/UI) loaded via
  `next/font/google`, self-hosted at build time, exposed as `--font-fraunces`/`--font-inter` CSS
  variables consumed by the `@theme` block above.

## Not yet built

- **Celebration Mode token/pool swap** (`data-celebration` attribute, alternate token set) — see
  build plan step 7.
- **Per-chapter atmosphere** (`chapters.atmosphere` jsonb -> inline style overrides scoped to a
  chapter page) — see build plan step 5/8.
- `app/page.tsx` still renders the raw `create-next-app` scaffold (it references
  `bg-foreground`/`text-background`, which no longer resolve to anything now that the token names
  changed) — this is expected until the reading-experience work (build plan step 5) replaces it;
  don't treat the broken scaffold styling as a regression from this change.

## Gotcha for later sessions

There is deliberately no light/dark mode toggle and no `prefers-color-scheme` branch — the
product brief calls for one consistent warm palette, not a generic dark mode. If a dark mode is
ever requested, it's a deliberate new decision, not a bug fix.
