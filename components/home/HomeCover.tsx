"use client";

import { useState } from "react";
import { useCelebrating } from "@/lib/celebration/useCelebrating";
import { OpeningSequence } from "@/lib/opening-sequence/OpeningSequence";
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
 * The page is always rendered, and the opening sits *on top* of it as an
 * opaque fixed overlay. Two things fall out of that, both wanted:
 *
 * 1. The page still server-renders. An earlier version withheld `children`
 *    until the opening finished, which meant the whole shelf was client-only.
 * 2. The overlay's fade-out *is* the "world appears" reveal — the real page is
 *    already sitting underneath, so it comes up through the dissolve rather
 *    than being swapped in after it.
 */
export function HomeCover({
  title,
  subtitle,
  celebrationLabel,
  celebrationMessage,
  children,
}: {
  title: string;
  subtitle?: string;
  celebrationLabel?: string;
  celebrationMessage?: string;
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
          onIntroComplete={markOpeningSeen}
          onComplete={() => setIntroGone(true)}
        />
      )}
      {children}
    </>
  );
}
