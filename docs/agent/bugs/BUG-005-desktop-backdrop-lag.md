# BUG-005: Painted-world backdrop laggy on desktop, smooth on mobile
- **Found:** 2026-08-03
- **Where:** `app/globals.css` (the touch-device compositing-cost section), `components/ambient/paint/`
- **Symptom:** Every backdrop perf fix to date (`2026-07-27-emoji-reactions-and-mobile-perf.md`,
  `2026-07-28-backdrop-compositing-and-parallax-cost.md`, `2026-07-28-scroll-parallax-off-on-touch-and-chapter-loading.md`)
  was gated on `@media (pointer: coarse)` — i.e. touch/phones only — on the explicit assumption
  that desktop had GPU headroom to spare ("Desktop can afford the fuller garden", "Desktop keeps
  the full brushwork"). User reported desktop laggy while mobile is smooth, confirmed reproduced
  on `localhost` (ruling out a dev-vs-production build artifact) and confirmed present across
  Safari, Chrome, and Firefox alike (ruling out a single-engine quirk like Safari's known weak
  spot for animated SVG filters).
- **Follow-up:** user narrowed it further — the lag is specifically while scrolling, not general/
  idle heaviness. That points squarely at `useParallax` (`lib/ambient/useParallax.ts`): the only
  thing in the backdrop driven by scroll at all, writing a transform every frame onto (among
  others) the `HillRange`/`Meadow` SVGs carrying the heaviest `feTurbulence` filters — and already
  proven to remove scroll lag when disabled, since that's exactly why it was off on touch.
- **Status:** fixed (2026-08-03), unverified on-device — in addition to the three unconditional
  CSS reductions above (still in place), `useParallax` was made a no-op on all devices, not just
  touch, extending the exact same already-validated trade. Meadow density thinning is still
  touch-only (real visible richness tradeoff, not an imperceptible one) — next lever if still
  heavy. See `log/2026-08-03-desktop-backdrop-lag.md`.
- **Not verified:** no on-device/browser trace was taken this session (no Playwright/CDP tooling
  available in this environment) — same caveat the original mobile perf sessions flagged twice.
  Next session should confirm the fix actually helped before treating this as settled. If parallax
  removal didn't fully fix it, the next candidate flagged but not investigated this session: chapter
  pages render each print as a `motion.div` with a `whileInView` transition and a large soft
  box-shadow (flagged, never examined, in `2026-07-29-auto-chapter-creation-decoupled-from-celebration.md`'s
  predecessor session) — box-shadow repaint is expensive and scales with how many prints are
  visible at once, which is naturally more on a wide desktop layout than a narrow phone one.
