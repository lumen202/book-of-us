# BUG-003: Unpainted strip at the bottom of the screen while scrolling on Android

- **Found:** 2026-07-27 (first misdiagnosed), correctly identified 2026-07-28
- **Where:** `components/ambient/StorybookSky.tsx`, the fixed backdrop's sizing
- **Symptom:** Scrolling on an Android phone, a band of flat cream
  (`--color-background`) appears along the bottom of the screen, below the
  meadow, where the painting should be. **It persists for as long as the finger
  stays down** and disappears on release.
- **Status:** fixed (2026-07-28) — scene sized to `100lvh` anchored at `top`,
  instead of `position: fixed; inset: 0`.

## Why the first fix didn't work

This was originally read as rubber-band overscroll (see
`log/2026-07-27-emoji-reactions-and-mobile-perf.md`) and "fixed" with
`overscroll-behavior-y: none`. That rule is correct and worth keeping, but it
addresses a different thing, and the bug survived it.

The symptom that settles it: **overscroll snaps back the instant you release, so
it cannot produce something that persists while you hold.** A strip that stays
until you lift your finger is not a bounce.

## Actual cause

Android Chrome retracts the URL toolbar as you scroll down, and the visible area
grows by its height. Chrome does **not** commit the corresponding layout-viewport
resize until the touch gesture ends — deliberately, because resizing the layout
viewport mid-scroll would reflow the page under the reader's finger.

So for the entire duration of a drag, a `position: fixed; inset: 0` element is
still sized to the pre-retraction viewport, while the screen is showing the
post-retraction area. The difference is a toolbar-high strip at the bottom that
the backdrop does not cover, and `body`'s own background shows through it. On
release, Chrome commits the resize, the backdrop grows, and the strip vanishes —
which is why it looked transient and got mistaken for a flash.

## Fix

`height: 100lvh` on the scene, anchored `top: 0`, replacing `inset: 0`.

`lvh` is the *large* viewport — the height with browser chrome retracted, i.e.
the largest the visible area ever gets — so the strip the toolbar is about to
vacate is already painted before it is exposed. `svh` and `dvh` would both
reintroduce the bug; `dvh` specifically by tracking the very resize that is being
deferred.

Anchoring to `top` is load-bearing: the uncovered strip is at the bottom, so the
extra height has to hang off the bottom edge. It pushes the meadow down by the
toolbar's height while the toolbar is showing, which is fine — that is where the
meadow settles anyway once the toolbar is gone.

## Not verified on-device

Reasoned from the reported symptom, not yet confirmed on real hardware — same
caveat as the rest of the 2026-07-28 mobile work.
