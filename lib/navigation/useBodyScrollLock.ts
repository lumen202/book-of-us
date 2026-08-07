"use client";

import { useEffect } from "react";

/**
 * Freezes the page behind a modal-like overlay — call unconditionally from a
 * component that is only ever mounted while the overlay is open (same
 * calling convention as `useCloseOnBack`, and often used alongside it).
 *
 * Sets `overflow: hidden` on `<body>` for as long as this is mounted, and
 * restores whatever the previous value was (not unconditionally `""`) on
 * cleanup — so two overlays that can momentarily both be mounted (a photo
 * lightbox opened from inside a reveal card, say) don't have the first one's
 * unmount silently re-enable scrolling while the second is still up.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
