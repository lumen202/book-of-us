"use client";

import { useRef } from "react";
import type { TouchEvent } from "react";

/**
 * Horizontal swipe → previous/next, the gesture phones already have for
 * "show me the one beside this". Returns touch handlers to spread onto the
 * swiped surface; either callback may be absent (first/last item), in which
 * case a swipe in that direction simply does nothing rather than wrapping —
 * an album has a first page and a last page.
 *
 * Deliberately touch events rather than a drag gesture: the surfaces this
 * mounts on scroll vertically (a memory's notes) or sit inside a modal, and a
 * real drag would fight both. The swipe is judged only on release —
 * horizontal enough (dominant axis by 1.5×) and far enough (56px) to be meant.
 */
export function useSwipeNavigation({
  onPrev,
  onNext,
}: {
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) {
      // A second finger means pinch-zoom, not paging.
      start.current = null;
      return;
    }
    start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }

  function onTouchEnd(event: TouchEvent) {
    const from = start.current;
    start.current = null;
    if (!from) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - from.x;
    const dy = touch.clientY - from.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // Swiping left pulls the next one in from the right, as in every gallery.
    if (dx < 0) onNext?.();
    else onPrev?.();
  }

  return { onTouchStart, onTouchEnd };
}
