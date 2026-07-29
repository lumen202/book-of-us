# 2026-07-29 — Mobile nav dropdown gets an unfold/reveal transition

User flagged that the nav "feels like a UI, not an experience." Diagnosis: both
`AppHeader.tsx`'s desktop link row and `MobileNavMenu.tsx`'s dropdown were generic app-chrome —
uppercase tracking-wide links, equal visual weight, and (for mobile) an instant show/hide with
no transition, which is exactly the "generic app pattern" the Experience Direction Invariants in
`AGENTS.md` ask to avoid.

Scope was deliberately narrowed to mobile only (credits-conscious session) — see
`bugs/BUG-004-desktop-nav-reads-as-utility-chrome.md` for the desktop row, left open for a future
session.

## What shipped
`components/nav/MobileNavMenu.tsx`: the dropdown panel is now a `framer-motion` `motion.div`
inside `AnimatePresence`, fading/scaling/sliding in from `top right` (`transformOrigin`) instead
of appearing instantly. Respects `useReducedMotion()` — collapses to a near-instant (0.1s) fade
with no y/scale movement, same convention `CompletionModal.tsx` already uses for its stage
transitions. No structural or hierarchy changes to the links themselves.

## Watch out for
- The desktop inline nav (`AppHeader.tsx`, `hidden sm:flex` row) still has the flat
  equal-weight-links issue — not touched, tracked in BUG-004.
- If revisiting nav further, consider whether a flat link list (even a nicely animated one) is
  itself the wrong shape per the invariants' "reduce simultaneous choices" guidance, vs. just a
  styling pass.
