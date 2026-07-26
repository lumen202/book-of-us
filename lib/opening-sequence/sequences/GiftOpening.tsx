"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { OpeningSceneProps } from "../types";

type Stage = "wrapped" | "untying" | "lifting" | "revealed";

/**
 * Celebration Mode's opening (5th of every month): a wrapped gift, not a
 * recolored version of the everyday envelope. Untying and lifting are two
 * distinct beats — a real gift always has a small pause after the bow comes
 * off before the lid actually lifts — with warmth blooming as it opens.
 */
export function GiftOpening({
  title,
  subtitle,
  reducedMotion,
  celebrationLabel,
  celebrationMessage,
  onIntroComplete,
}: OpeningSceneProps) {
  const [stage, setStage] = useState<Stage>("wrapped");

  const untieDuration = reducedMotion ? 0.2 : 0.5;
  const lidDuration = reducedMotion ? 0.25 : 0.9;
  const glowDuration = reducedMotion ? 0.3 : 1.4;
  const textDuration = reducedMotion ? 0.3 : 0.9;
  const holdMs = reducedMotion ? 500 : 1900;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "var(--color-background)" }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.6 }}
    >
      <motion.div
        className="pointer-events-none absolute h-96 w-96 rounded-full"
        style={{
          background: "radial-gradient(circle, var(--color-accent-muted), transparent 70%)",
        }}
        animate={{
          opacity: stage === "lifting" || stage === "revealed" ? 1 : 0,
          scale: stage === "lifting" || stage === "revealed" ? 1.15 : 0.7,
        }}
        transition={{ duration: glowDuration, ease: "easeOut" }}
      />

      <motion.button
        type="button"
        aria-label={celebrationLabel ? `Open your ${celebrationLabel}` : "Open your gift"}
        onClick={() => stage === "wrapped" && setStage("untying")}
        disabled={stage !== "wrapped"}
        animate={{ opacity: stage === "revealed" ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0.2 : 0.5 }}
        className="relative flex h-40 w-40 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <motion.div
          className="absolute inset-x-2 bottom-0 h-28 rounded-sm bg-accent"
          animate={
            !reducedMotion && stage === "wrapped" ? { scale: [1, 1.025, 1] } : { scale: 1 }
          }
          transition={
            !reducedMotion && stage === "wrapped"
              ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
          }
        />

        {/* ribbon, vertical strip under the lid */}
        <div className="absolute bottom-0 left-1/2 h-28 w-3 -translate-x-1/2 bg-accent-muted" />

        {/* bow — unties first, its own beat before the lid moves */}
        <motion.div
          className="absolute left-1/2 top-3 flex -translate-x-1/2 -translate-y-1/2 gap-1"
          animate={
            stage === "wrapped"
              ? { scale: 1, opacity: 1, rotate: 0 }
              : { scale: 0.4, opacity: 0, rotate: 35 }
          }
          transition={{ duration: untieDuration, ease: "easeIn" }}
          onAnimationComplete={() => {
            if (stage === "untying") setStage("lifting");
          }}
        >
          <div className="h-4 w-5 -rotate-12 rounded-full bg-accent-muted" />
          <div className="h-4 w-5 rotate-12 rounded-full bg-accent-muted" />
        </motion.div>

        {/* lid — lifts only after the bow is gone */}
        <motion.div
          className="absolute inset-x-0 top-3 h-10 origin-bottom rounded-sm bg-accent"
          animate={
            stage === "lifting" || stage === "revealed"
              ? { y: -56, opacity: 0, rotate: -10 }
              : { y: 0, opacity: 1, rotate: 0 }
          }
          transition={{ duration: lidDuration, ease: "easeInOut" }}
          onAnimationComplete={() => {
            if (stage === "lifting") setStage("revealed");
          }}
        />
      </motion.button>

      {stage === "wrapped" && (
        <motion.p
          initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.7, ease: "easeOut" }}
          className="mt-6 text-xs uppercase tracking-[0.24em] text-ink-muted"
        >
          Untie the ribbon
        </motion.p>
      )}

      {stage === "revealed" && (
        <motion.div
          initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: textDuration, ease: "easeOut" }}
          onAnimationComplete={() => window.setTimeout(onIntroComplete, holdMs)}
          className="absolute flex flex-col items-center gap-3 text-center"
        >
          {celebrationLabel && (
            <span className="text-xs uppercase tracking-[0.3em] text-accent">
              {celebrationLabel}
            </span>
          )}
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">{title}</h1>
          {subtitle && <p className="text-ink-muted">{subtitle}</p>}
          {celebrationMessage && (
            <p className="max-w-sm font-serif text-lg italic text-ink">{celebrationMessage}</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
