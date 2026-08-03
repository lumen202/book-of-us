"use client";

import type { RefObject } from "react";

/**
 * Scroll parallax for the painted world. **Currently disabled everywhere —
 * see the 2026-08-03 section below.**
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
 *
 * ## 2026-08-03: disabled everywhere, not just touch (BUG-005)
 *
 * Desktop scroll was reported laggy too, across Safari/Chrome/Firefox alike.
 * This is the only thing in the backdrop that reacts to scrolling at all, and
 * it writes a transform every frame onto (among others) the
 * `HillRange`/`Meadow` SVGs that carry the heaviest `feTurbulence` filters —
 * the same mechanism already proven to fix scroll lag when removed, since
 * that's exactly why it was off on touch. The implementation below is gone
 * rather than commented out (this repo's convention — see `AGENTS.md`); it's
 * intact in git history at this commit if the desktop fix needs revisiting,
 * e.g. a lighter version limited to the unfiltered sky layer instead of an
 * outright removal.
 *
 * A no-op now, kept with its original signature so call sites don't need
 * touching if it's reinstated.
 */
export function useParallax(_ref: RefObject<HTMLElement | null>, _range = 1100): void {}
