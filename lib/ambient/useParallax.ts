"use client";

import { useEffect, type RefObject } from "react";

/**
 * Scroll parallax for the painted world.
 *
 * Publishes a single unitless custom property, `--scroll` (0 → 1), on the scene
 * container. Every layer then declares its own travel in its own style
 * (`translate3d(0, calc(var(--scroll) * -30px), 0)`), which means the camera
 * costs exactly one property write per frame no matter how many layers there
 * are — no per-element JS, no layout reads.
 *
 * Two deliberate limits:
 *
 * - **The travel is clamped.** Progress saturates after `range` px of scroll,
 *   so a long chapter page can't slide the meadow up off the bottom of the
 *   screen. Depth is established in the first screenful; after that the camera
 *   holds still.
 * - **It is small.** Tens of pixels, not hundreds. The effect should be felt as
 *   the world having thickness, not noticed as an effect.
 *
 * Under `prefers-reduced-motion` the hook never attaches, so `--scroll` stays
 * at its declared `0` and the scene simply sits still.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, range = 1100): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Kept in sync with the CSS switch at the bottom of globals.css — see the
    // comment there for why `(pointer: coarse)` is included alongside the
    // accessibility setting.
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;

    let frame = 0;
    let last = -1;

    const apply = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, window.scrollY / range));
      // Three decimals is finer than a pixel of travel; rounding here keeps us
      // from touching the style object on every idle frame.
      const value = Math.round(progress * 1000) / 1000;
      if (value === last) return;
      last = value;
      element.style.setProperty("--scroll", String(value));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, range]);
}
