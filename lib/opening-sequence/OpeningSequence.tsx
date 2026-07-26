"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCelebrating } from "@/lib/celebration/useCelebrating";
import { EnvelopeOpening, GiftOpening } from "./sequences";

type OpeningSequenceProps = {
  title: string;
  subtitle?: string;
  celebrationLabel?: string;
  celebrationMessage?: string;
  /** Called after the scene has fully exited — safe to reveal the real page now. */
  onComplete: () => void;
};

export function OpeningSequence({
  title,
  subtitle,
  celebrationLabel,
  celebrationMessage,
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

  const Scene = celebrating ? GiftOpening : EnvelopeOpening;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!introDone && (
        <Scene
          key={celebrating ? "gift" : "envelope"}
          title={title}
          subtitle={subtitle}
          celebrationLabel={celebrationLabel}
          celebrationMessage={celebrationMessage}
          reducedMotion={reducedMotion}
          onIntroComplete={() => setIntroDone(true)}
        />
      )}
    </AnimatePresence>
  );
}
