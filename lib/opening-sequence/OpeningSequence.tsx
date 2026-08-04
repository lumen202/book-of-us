"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCelebrating } from "@/lib/celebration/useCelebrating";
import { MonthsaryOpening } from "./sequences";
import type { MonthPrint } from "./types";
import type { LoveLetter } from "@/lib/relationship/types";

type OpeningSequenceProps = {
  title: string;
  subtitle?: string;
  celebrationLabel?: string;
  celebrationMessage?: string;
  monthsaryNumber?: number;
  monthPrints?: MonthPrint[];
  letter?: LoveLetter;
  whisperLines?: string[];
  /**
   * Called the moment the scene's story ends, while it's still dissolving.
   * The page should start appearing here so it comes up *through* the
   * opening instead of after it.
   */
  onIntroComplete?: () => void;
  /** Called after the scene has fully exited — safe to unmount it now. */
  onComplete: () => void;
};

export function OpeningSequence({
  title,
  subtitle,
  celebrationLabel,
  celebrationMessage,
  monthsaryNumber,
  monthPrints,
  letter,
  whisperLines,
  onIntroComplete,
  onComplete,
}: OpeningSequenceProps) {
  const celebrating = useCelebrating();
  const reducedMotion = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    // `celebrating` can depend on a client-only override (query param /
    // localStorage), which the server can't see. Gating the scene behind a
    // mount flag keeps the SSR output and the client's pre-effect render
    // identical (both render nothing) — the real scene only appears after
    // this effect flips `mounted`, a deliberate one-time extra render, not
    // the pattern this lint rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Only ever mounted on a celebration day (see HomeCover), so there is no
  // everyday scene to pick.
  //
  // There used to be a second scene here — a wrapped-gift variant, chosen when
  // there was no relationship row and therefore no "Happy Nth Monthsary" label
  // to build a greeting from. It was deleted rather than rebuilt: it could only
  // ever appear in a state the book is not really usable in, it was the plainest
  // art in the project, and `MonthsaryOpening` already falls back to a generic
  // "Happy Monthsary" when the label is missing. One ceremony, kept good.
  if (!celebrating) return null;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!introDone && (
        <MonthsaryOpening
          title={title}
          subtitle={subtitle}
          celebrationLabel={celebrationLabel}
          celebrationMessage={celebrationMessage}
          monthsaryNumber={monthsaryNumber}
          monthPrints={monthPrints}
          letter={letter}
          whisperLines={whisperLines}
          reducedMotion={reducedMotion}
          onIntroComplete={() => {
            setIntroDone(true);
            onIntroComplete?.();
          }}
        />
      )}
    </AnimatePresence>
  );
}
