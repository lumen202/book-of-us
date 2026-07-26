"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCelebrating } from "@/lib/celebration/useCelebrating";
import { GiftOpening, MonthsaryOpening } from "./sequences";

type OpeningSequenceProps = {
  title: string;
  subtitle?: string;
  celebrationLabel?: string;
  celebrationMessage?: string;
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
  // everyday scene to pick — `GiftOpening` is the fallback for the case where
  // there's no relationship row yet and therefore no "Happy Nth Monthsary"
  // label to build the greeting from.
  if (!celebrating) return null;

  const Scene = celebrationLabel ? MonthsaryOpening : GiftOpening;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!introDone && (
        <Scene
          key={celebrationLabel ? "monthsary" : "gift"}
          title={title}
          subtitle={subtitle}
          celebrationLabel={celebrationLabel}
          celebrationMessage={celebrationMessage}
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
