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
- **Status:** fixed (2026-08-03) — restructured rather than re-skinned. Bookshelf/Bucket
  list/Vault stay inline (primary destinations); Settings/Keeper/"Step out for now" moved behind
  a new `More` dropdown (`components/nav/DesktopMoreMenu.tsx`, replacing `AdminMenu.tsx`) with
  the same unfold/fade transition `MobileNavMenu` already has. Flat row goes from 6 equal-weight
  links down to 3 + one affordance, and stays that way as admin-only pages are added since new
  utility links land in the dropdown, not the row. See
  `log/2026-08-03-desktop-nav-more-menu.md`.
