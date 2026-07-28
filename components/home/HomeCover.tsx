"use client";

import { useState } from "react";
import { useCelebrating } from "@/lib/celebration/useCelebrating";
import { OpeningSequence } from "@/lib/opening-sequence/OpeningSequence";
import type { MonthPrint } from "@/lib/opening-sequence/types";
import { markOpeningSeen, useOpeningSeen } from "@/lib/opening-sequence/useOpeningSeen";

/**
 * Decides whether this visit gets a ceremony before the shelf.
 *
 * **Only the 5th does.** An ordinary day goes straight to the page — the
 * envelope used to play every single visit, which turned the ceremony into a
 * toll booth and made the monthsary opening feel like more of the same instead
 * of an event. Celebration Mode (the real 5th, or the dev preview override)
 * is the only thing that earns an interruption.
 *
 * The page is always rendered, and the opening sits *on top* of it as a fixed
 * overlay. Two things fall out of that, both wanted:
 *
 * 1. The page still server-renders. An earlier version withheld `children`
 *    until the opening finished, which meant the whole shelf was client-only.
 * 2. The overlay's fade-out *is* the "world appears" reveal — the real page is
 *    already sitting underneath, so it comes up through the dissolve rather
 *    than being swapped in after it.
 *
 * ## The overlay is transparent, and the shelf is what gets hidden
 *
 * It used to be opaque, carrying its own painted scenery, and that was the
 * thing making the ceremony feel like a different app from the book it opened
 * into: the intro's world was a handful of flat ellipses and beziers, drawn
 * before `StorybookSky` was rebuilt as a generated garden, and never brought
 * forward.
 *
 * So now nothing is painted twice. The overlay has no background at all, the
 * app's own `StorybookSky` (mounted in the layout, at `-z-10`) shows straight
 * through it, and it is only the *shelf* that is veiled while the ceremony
 * runs. The ritual therefore happens in the actual garden, at golden hour, and
 * the handoff is no longer world A → world B — it is the same afternoon, with
 * the letter put down.
 *
 * Hiding the shelf with `opacity`/`visibility` rather than by not rendering it
 * keeps (1) above true: it is still server-rendered, still in the DOM, still
 * the same markup the reveal fades up. `visibility: hidden` is what takes it
 * out of the tab order and off screen readers while it is invisible — opacity
 * alone would leave a fully focusable page sitting under the ceremony.
 */
export function HomeCover({
  title,
  subtitle,
  celebrationLabel,
  celebrationMessage,
  monthsaryNumber,
  monthPrints = [],
  children,
}: {
  title: string;
  subtitle?: string;
  celebrationLabel?: string;
  celebrationMessage?: string;
  /** Which monthsary this is — the ceremony's copy branches on it. */
  monthsaryNumber?: number;
  /** This month's photographs, for the ceremony's look back. May be empty. */
  monthPrints?: MonthPrint[];
  children: React.ReactNode;
}) {
  const celebrating = useCelebrating();
  const openingSeen = useOpeningSeen();
  const [introGone, setIntroGone] = useState(false);

  // `openingSeen` is "unknown" until after mount, which keeps this expression
  // false on the server and on the client's first render — so the overlay
  // never causes a hydration mismatch, even though both `celebrating` and
  // `openingSeen` depend on client-only storage.
  const showOpening = openingSeen === "unseen" && celebrating && !introGone;

  return (
    <>
      {showOpening && (
        <OpeningSequence
          title={title}
          subtitle={subtitle}
          celebrationLabel={celebrationLabel}
          celebrationMessage={celebrationMessage}
          monthsaryNumber={monthsaryNumber}
          monthPrints={monthPrints}
          onIntroComplete={markOpeningSeen}
          onComplete={() => setIntroGone(true)}
        />
      )}
      <div
        // Not `display: none` — the shelf keeps its layout so the reveal has
        // nothing to reflow, and the transition is a plain opacity fade.
        style={{
          opacity: showOpening ? 0 : 1,
          visibility: showOpening ? "hidden" : "visible",
          transition: "opacity 1.4s ease-out",
        }}
      >
        {children}
      </div>
    </>
  );
}
