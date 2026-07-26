"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

/**
 * Delivers a handful of short lines one at a time — fade in, hold, fade out,
 * next — so the first message lands as speech with pauses in it rather than a
 * paragraph that appears all at once.
 *
 * Sequencing follows the same rule as the opening scenes: advance from an
 * animation's completion callback, never from a `useEffect` timer chain (that
 * drifts out of sync with the real animation durations and trips
 * `react-hooks/set-state-in-effect`). The hold between lines is a `setTimeout`
 * started *inside* that callback, which is a plain event handler, not an
 * effect.
 */
export function WhisperSequence({
  lines,
  reducedMotion,
  onComplete,
  className = "",
}: {
  lines: readonly string[];
  reducedMotion: boolean;
  /** Fires once the last line has faded out. */
  onComplete: () => void;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  /**
   * `onAnimationComplete` fires for exits too, and an exiting line still holds
   * the index it was rendered with. Recording the last index we scheduled from
   * means a stale exit callback can never queue a second advance.
   */
  const scheduledFrom = useRef(-1);

  const fadeDuration = reducedMotion ? 0.25 : 1.1;
  const holdMs = reducedMotion ? 450 : 1500;

  return (
    <AnimatePresence
      mode="wait"
      onExitComplete={() => {
        if (finished) onComplete();
      }}
    >
      {!finished && (
        <motion.p
          key={index}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
          transition={{ duration: fadeDuration, ease: "easeOut" }}
          onAnimationComplete={() => {
            if (scheduledFrom.current === index) return;
            scheduledFrom.current = index;
            window.setTimeout(() => {
              if (index + 1 < lines.length) setIndex(index + 1);
              else setFinished(true);
            }, holdMs);
          }}
          className={className}
        >
          {lines[index]}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
