"use client";

import { useEffect } from "react";

/**
 * How many overlays currently want the page behind them frozen.
 *
 * Module-level, so every caller shares one count. This *has* to be shared: the
 * previous version saved `document.body.style.overflow` on mount and restored
 * that saved value on unmount, which strands the page permanently unscrollable
 * as soon as two overlays unmount in the wrong order — and with a reveal card
 * opening inside a discovery layer (`PlaceRevealOverlay` inside
 * `DiscoveryLayer`), the wrong order is the normal one:
 *
 *   1. Layer opens.       saved: ""       → sets "hidden"
 *   2. Reveal opens.      saved: "hidden" → sets "hidden"
 *   3. Escape closes both. The layer's cleanup runs first and restores its
 *      saved "", then the reveal's cleanup runs and restores its saved
 *      "hidden" — onto a page with no overlays left on it.
 *
 * The reader is then looking at an ordinary page that will not scroll, with
 * nothing on screen to explain why and no way back short of a reload. A count
 * has no ordering to get wrong: the style is set when the count rises from 0
 * and cleared when it returns to 0, whoever happens to unmount first.
 */
let lockCount = 0;

/** What `overflow` was before the first lock — restored when the last one lifts. */
let restoreTo = "";

/**
 * Freezes the page behind a modal-like overlay for as long as `active` is true.
 *
 * Safe to nest and to overlap: several overlays may hold the lock at once, in
 * any order, and the page unfreezes exactly when the last of them lets go.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      restoreTo = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = restoreTo;
    };
  }, [active]);
}
