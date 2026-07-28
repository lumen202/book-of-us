"use client";

import { useEffect, type RefObject } from "react";

/**
 * Scroll parallax for the painted world.
 *
 * Collects every element inside the scene marked with `data-parallax` (see
 * `depth.ts`, which also explains why the travel is an attribute rather than an
 * inherited custom property) and writes each one's `transform` directly, once
 * per animation frame, only when the value has actually changed.
 *
 * That is nine `style.transform` writes per frame on nine elements that are
 * already on the compositor, invalidating no descendants — rather than one
 * custom-property write that forces a style recalculation of the entire scene
 * subtree. The layer list is read once on mount; the scene's layers are static,
 * so there is nothing to observe.
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
 * Under `prefers-reduced-motion` the hook never attaches, so every layer keeps
 * the resting `translate3d(0, 0, 0)` it was rendered with and the scene simply
 * sits still.
 *
 * ## Why touch devices get no parallax at all
 *
 * This is the one piece of motion in the backdrop that is *driven by scrolling*,
 * and scrolling is the moment a phone has least to spare. It is also the only
 * thing that makes the fixed backdrop change at all while the reader scrolls:
 * with it off, the whole painting is a texture the compositor already has and
 * scrolling costs nothing behind the page. With it on, nine layers move, and
 * the paper-grain layer over them — `mix-blend-mode`, viewport-sized — has to
 * re-resolve against a changed backdrop every single frame of every scroll.
 *
 * Freezing the parallax was tried after the blend-stack work landed and the
 * scroll was still heavy near the top of the page (past 1100px the travel
 * clamps, the layers stop moving, and it came good — which is what identified
 * it). Nothing else in the backdrop is touched: the wind still crosses the
 * meadow, the clouds still drift, and the butterflies still come and go. What a
 * phone loses is the world having thickness *as you scroll*, which is the
 * cheapest thing here to give up and the only one that was being paid for at
 * exactly the wrong moment.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, range = 1100): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Both kinds appear: the hills are `<svg>` elements carrying the attribute
    // directly, everything else is a wrapper `<div>`. Both have `style` and
    // `dataset`, which is all this touches.
    const layers = Array.from(
      element.querySelectorAll<HTMLElement | SVGElement>("[data-parallax]"),
    ).map((node) => ({ node, travel: Number(node.dataset.parallax) || 0 }));
    if (!layers.length) return;

    let frame = 0;
    let last = -1;

    const apply = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, window.scrollY / range));
      // Three decimals is finer than a pixel of travel; rounding here keeps us
      // from touching a style object on every idle frame.
      const value = Math.round(progress * 1000) / 1000;
      if (value === last) return;
      last = value;

      for (const layer of layers) {
        const y = Math.round(value * layer.travel * 100) / 100;
        layer.node.style.transform = `translate3d(0, ${y}px, 0)`;
      }
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
