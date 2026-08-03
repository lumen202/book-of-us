# 2026-08-03 — Desktop backdrop lag: extended touch-only perf fixes, disabled parallax everywhere

User reported the painted-world backdrop laggy on desktop while mobile stayed smooth — the
opposite of what every prior perf session had optimized for. `BUG-005`.

## Diagnosis

Every backdrop perf fix to date (2026-07-27/28 sessions) was gated on `@media (pointer: coarse)`,
i.e. touch only, on the explicit assumption desktop had GPU headroom to spare. Confirmed via
questions to the user: reproduced on `localhost` (not a dev-vs-prod build artifact), present
across Safari/Chrome/Firefox alike (not a single-engine quirk), and — the detail that actually
pinned it down — specifically while scrolling, not idle.

Scroll-specific narrows it to one mechanism: `useParallax` is the only thing in the backdrop that
reacts to scrolling at all, per its own doc comment. It writes `style.transform` every frame onto
nine layers, including the `HillRange`/`Meadow` SVGs that carry the heaviest `feTurbulence` brush
filters (`PaintFilters.tsx`) — and disabling it is already the proven fix for scroll lag, since
that's exactly why it was off on touch to begin with.

## Shipped

- `app/globals.css`: three of the four touch-only (`(pointer: coarse)`) cost reductions made
  unconditional — paper grain 3→1 blend pass, freezing the always-looping under-blend animations
  (`ambient-sky-warm` etc.), and the `-lite` single-pass SVG filter brushes. Each was already
  judged visually negligible when it shipped for touch, so there's no quality cost to paying for
  it everywhere. Meadow density thinning was deliberately left touch-only — a real, visible
  richness reduction ("desktop can afford the fuller garden"), not an imperceptible one.
- `lib/ambient/useParallax.ts`: made a no-op on all devices, not just touch. Implementation
  deleted rather than commented out (repo convention), full logic recoverable from git history at
  this commit. Doc comment rewritten to lead with current disabled status, with a dated section
  explaining why, so a future reader isn't misled by the original present-tense description of an
  active hook.

## Not verified

No on-device or browser trace was taken — no Playwright/CDP tooling available in this
environment. Same caveat the original mobile-perf sessions flagged twice over. Next session should
confirm this actually fixed the desktop scroll lag before treating it as settled.

## If still laggy

- Meadow thinning is the next lever on the CSS side (see the updated comment in `globals.css`).
- Unexamined and still flagged from an earlier session: chapter pages render each print as a
  `motion.div` with a `whileInView` transition and a large soft box-shadow — box-shadow repaint
  cost scales with visible print count, naturally higher on a wide desktop grid than a narrow
  phone one. Worth a look if the fix here doesn't fully resolve it, especially if the lag is on a
  chapter page rather than the shelf/home page.
- If parallax needs to come back in some form, a lighter version limited to the unfiltered sky
  layer (`NightSky.tsx`, no `feTurbulence` filter) rather than the ridge/meadow layers is the
  documented middle ground — not attempted this session since the full removal was the more direct
  test of the diagnosis.
