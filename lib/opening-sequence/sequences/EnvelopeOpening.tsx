"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { OpeningSceneProps } from "../types";

type Stage = "sealed" | "breaking" | "opening" | "revealed";

/**
 * The everyday opening: a sealed letter, not a page that just fades in.
 * Four honest beats — idle invitation, the seal breaking, the flap lifting
 * while light blooms behind it, then the title settling into that light —
 * so there's a real buildup instead of a straight cut to text.
 */
export function EnvelopeOpening({
  title,
  subtitle,
  reducedMotion,
  onIntroComplete,
}: OpeningSceneProps) {
  const [stage, setStage] = useState<Stage>("sealed");

  const breakDuration = reducedMotion ? 0.2 : 0.45;
  const flapDuration = reducedMotion ? 0.25 : 0.9;
  const glowDuration = reducedMotion ? 0.3 : 1.3;
  const textDuration = reducedMotion ? 0.3 : 0.9;
  const holdMs = reducedMotion ? 400 : 1600;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6"
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.6 }}
    >
      {/* light bloom, building behind the envelope as it opens */}
      <motion.div
        className="pointer-events-none absolute h-96 w-96 rounded-full"
        style={{
          background: "radial-gradient(circle, var(--color-accent-muted), transparent 70%)",
        }}
        animate={{
          opacity: stage === "opening" || stage === "revealed" ? 0.9 : 0,
          scale: stage === "opening" || stage === "revealed" ? 1.1 : 0.7,
        }}
        transition={{ duration: glowDuration, ease: "easeOut" }}
      />

      <motion.button
        type="button"
        aria-label="Open the book"
        onClick={() => stage === "sealed" && setStage("breaking")}
        disabled={stage !== "sealed"}
        animate={{ opacity: stage === "revealed" ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0.2 : 0.5 }}
        className="relative flex h-44 w-72 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <motion.div
          className="absolute inset-0 rounded-sm border border-border bg-surface shadow-sm"
          animate={
            !reducedMotion && stage === "sealed" ? { scale: [1, 1.015, 1] } : { scale: 1 }
          }
          transition={
            !reducedMotion && stage === "sealed"
              ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
          }
        />

        <motion.div
          className="absolute left-0 top-0 h-1/2 w-full origin-top border border-border bg-surface"
          style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
          animate={{ rotateX: stage === "opening" || stage === "revealed" ? -170 : 0 }}
          transition={{ duration: flapDuration, ease: "easeInOut" }}
          onAnimationComplete={() => {
            if (stage === "opening") setStage("revealed");
          }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent font-serif text-[11px] tracking-wide text-background shadow-sm"
          animate={
            stage === "breaking" || stage === "opening" || stage === "revealed"
              ? { scale: 0, opacity: 0, rotate: 20 }
              : { scale: 1, opacity: 1, rotate: 0 }
          }
          transition={
            stage === "breaking"
              ? { duration: breakDuration, ease: "easeIn" }
              : { duration: 0.4 }
          }
          onAnimationComplete={() => {
            if (stage === "breaking") setStage("opening");
          }}
        >
          J&amp;L
        </motion.div>
      </motion.button>

      {stage === "revealed" && (
        <motion.div
          initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: textDuration, ease: "easeOut" }}
          onAnimationComplete={() => window.setTimeout(onIntroComplete, holdMs)}
          className="absolute flex flex-col items-center gap-3 text-center"
        >
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">{title}</h1>
          {subtitle && <p className="text-ink-muted">{subtitle}</p>}
        </motion.div>
      )}
    </motion.div>
  );
}
