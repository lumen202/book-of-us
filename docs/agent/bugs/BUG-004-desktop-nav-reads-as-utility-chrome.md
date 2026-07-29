# BUG-004: Desktop inline nav reads as utility chrome, not part of the experience
- **Found:** 2026-07-29
- **Where:** `components/nav/AppHeader.tsx` (the `hidden sm:flex` inline link row)
- **Symptom:** Above the `sm` breakpoint, Bookshelf/Bucket list/Vault/Settings/Keeper/"Step out
  for now" all render as equal-weight uppercase tracking-wide links in a flat row — closer to
  generic SaaS dashboard nav than the unfold/lift/reveal vocabulary described in
  `AGENTS.md`'s Experience Direction Invariants. The mobile hamburger menu (`MobileNavMenu.tsx`)
  had the same issue and was fixed this session (see `log/2026-07-29-mobile-nav-unfold-reveal.md`)
  by giving the dropdown an unfold/fade transition via framer-motion, matching the
  `useReducedMotion` convention already used in `CompletionModal.tsx`. The desktop row wasn't
  touched — scope was deliberately kept to mobile only.
- **Status:** open — next session should decide whether to restructure the desktop row's
  hierarchy (e.g. demote "Settings"/"Step out for now" visually, lead with whatever's most
  emotionally central) rather than just re-skinning it, since a flat equal-weight link list is
  itself a "broad navigation" pattern the invariants ask to reduce.
