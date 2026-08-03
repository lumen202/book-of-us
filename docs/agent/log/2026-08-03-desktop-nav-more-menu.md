# 2026-08-03 — Desktop nav restructured behind a `More` menu

User flagged that the desktop inline nav would clump the same way the mobile one used to once
more options get added — this is `BUG-004`, left open from the 2026-07-29 mobile nav session.

## What shipped
- `components/nav/AppHeader.tsx`: the `hidden sm:flex` row now only holds the three primary
  destinations — Bookshelf, Bucket list, Vault. Settings, the Keeper-only links, and "Step out
  for now" moved into a new `More` dropdown.
- `components/nav/DesktopMoreMenu.tsx` (new, replaces `components/nav/AdminMenu.tsx`): same
  click-outside/Escape/`framer-motion` unfold-fade mechanics as `MobileNavMenu`, folding admin
  items in directly via `AdminMenuItems` instead of nesting a dropdown inside a dropdown.
- Updated stale `AdminMenu.tsx` references in `settings/page.tsx`, `CelebrationDevToggle.tsx`,
  and `AdminMenuItems.tsx` comments to point at `DesktopMoreMenu`.

## Why this shape
Per the Experience Direction Invariants, a flat equal-weight link row is itself a "broad
navigation" pattern to reduce, not just a mobile-width problem — collapsing utility links behind
one affordance keeps the primary destinations tactile and legible on desktop too, and means new
admin-only pages land in the dropdown instead of widening the row.

## Watch out for
- `DesktopMoreMenu` doesn't hide during the opening ceremony (matches the old `AdminMenu`'s
  behavior, which also didn't) — only `NightModeIconToggle` and `MobileNavMenu` do, since those
  sit in the same corner as the ceremony's "Skip intro" button. If the `More` trigger ever visibly
  collides with that button, revisit.
