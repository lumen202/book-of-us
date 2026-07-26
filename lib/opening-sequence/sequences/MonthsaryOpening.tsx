"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { MonthsaryGarland, MonthsaryScenery } from "../art/MonthsaryGarland";
import { WhisperSequence } from "../WhisperSequence";
import { monthsaryWhispers } from "../whispers";
import type { OpeningSceneProps } from "../types";

type Stage = "arriving" | "sealed" | "petals" | "letter" | "whisper" | "revealed";

/**
 * Monthsary opening (5th): romantic keepsake ritual.
 * Arrive in the dark -> break seal -> petals drift -> letter unfolds ->
 * dedication appears. The `arriving` beat is empty on purpose: on the one day
 * that's supposed to feel different, she should notice the atmosphere has
 * changed before she's handed anything to do.
 */
export function MonthsaryOpening({
  title,
  subtitle,
  reducedMotion,
  celebrationLabel,
  celebrationMessage,
  onIntroComplete,
}: OpeningSceneProps) {
  const [stage, setStage] = useState<Stage>("arriving");
  const [letterReady, setLetterReady] = useState(false);

  const hushDuration = reducedMotion ? 0.4 : 3.2;

  const petalsDuration = reducedMotion ? 0.22 : 2.1;
  const letterDuration = reducedMotion ? 0.3 : 5.8;
  const inkDuration = reducedMotion ? 0.28 : 4.2;
  const textDuration = reducedMotion ? 0.25 : 1.0;

  const romanticLine =
    celebrationMessage ?? "Some loves do not pass time. They turn it into memory.";
  const monthsaryHeading = celebrationLabel ?? "Happy Monthsary";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6"
      style={{
        background: "linear-gradient(180deg, #fbe3c2 0%, #f9d4c3 42%, #fdf1de 100%)",
      }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.6 }}
    >
      {/* The painted world this whole scene happens inside. Rendered from the
          first frame, not just at the greeting — this overlay covers the app's
          StorybookSky, so without it the opening's long middle is a bare
          gradient. Everything below stacks on top of it. */}
      <MonthsaryScenery reducedMotion={reducedMotion} />

      {stage !== "arriving" && stage !== "revealed" && (
        <button
          type="button"
          onClick={onIntroComplete}
          className="absolute right-5 top-5 z-20 rounded-full border border-[#e8b48f] bg-[#fffbf2]/90 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-[#8a5f45] transition hover:text-[#5a3b2e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Skip intro
        </button>
      )}

      <motion.div
        className="pointer-events-none absolute -top-12 h-96 w-96 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(245,186,132,0.9), rgba(253,241,222,0) 70%)",
        }}
        animate={
          stage === "arriving"
            ? { opacity: 0.18, scale: 0.7 }
            : { opacity: stage === "sealed" ? 0.35 : 0.92, scale: stage === "sealed" ? 0.82 : 1.16 }
        }
        transition={{ duration: reducedMotion ? 0.25 : 2.1, ease: "easeOut" }}
      />

      {stage === "arriving" && (
        <motion.div
          className="pointer-events-none absolute flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: hushDuration, ease: "easeInOut" }}
          onAnimationComplete={() => setStage("sealed")}
        >
          <motion.span
            className="h-28 w-28 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(243,176,146,0.75), rgba(253,241,222,0) 72%)",
            }}
            animate={reducedMotion ? { opacity: 0.5 } : { opacity: [0.28, 0.7, 0.28], scale: [1, 1.16, 1] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <motion.span
            key={i}
            className="absolute h-3 w-2.5 rounded-[90%_60%_85%_70%]"
            style={{
              top: `${12 + ((i * 11) % 48)}%`,
              left: `${6 + ((i * 13) % 84)}%`,
              background: i % 2 === 0 ? "#f2a7b6" : "#f5c69f",
            }}
            animate={
              stage === "petals"
                ? {
                    y: [0, 180, 360],
                    x: [0, i % 2 === 0 ? -26 : 26, i % 2 === 0 ? 16 : -16],
                    rotate: [0, 110, 280],
                    opacity: [0, 0.9, 0.6, 0],
                  }
                : { opacity: 0 }
            }
            transition={{
              duration: reducedMotion ? 0.45 : 2.4 + i * 0.28,
              delay: reducedMotion ? 0 : i * 0.22,
              repeat: stage === "petals" && !reducedMotion ? Infinity : 0,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Clears away for the whisper run-up so the greeting isn't already on
          screen when the big version of it lands. */}
      {(stage === "petals" || stage === "letter") && (
        <motion.div
          className="pointer-events-none absolute top-7 flex flex-col items-center gap-2 text-center"
          initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 1.2, ease: "easeOut" }}
        >
          <span className="font-serif text-2xl tracking-wide text-[#6d5240] sm:text-3xl">
            {monthsaryHeading}
          </span>
          <motion.span
            className="h-px w-48 bg-gradient-to-r from-transparent via-accent/60 to-transparent"
            animate={{ opacity: [0.35, 1, 0.35], scaleX: [0.9, 1, 0.9] }}
            transition={{ duration: reducedMotion ? 0.5 : 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}

      {stage === "sealed" && (
        <motion.div
          className="absolute flex flex-col items-center"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.9, ease: "easeOut" }}
        >
          <motion.button
            type="button"
            aria-label="Open the monthsary letter"
            onClick={() => setStage("petals")}
            className="group relative flex h-52 w-80 items-center justify-center rounded-2xl border border-[#ecd8bc] bg-[#fffbf2] shadow-[0_30px_40px_-30px_rgba(150,112,80,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="absolute inset-x-0 top-0 h-1/2 border border-[#e5caa8] bg-[#faeacf] [clip-path:polygon(0_0,100%_0,50%_100%)]" />

            <motion.div
              className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#e0806a] text-sm font-semibold text-white"
              animate={{ scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }}
              transition={{ duration: reducedMotion ? 0.35 : 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              us
            </motion.div>

            <span className="absolute bottom-4 text-[11px] uppercase tracking-[0.26em] text-[#a2805f] transition group-hover:text-[#6d5240]">
              Break the seal
            </span>
          </motion.button>

          <p className="mt-8 font-serif text-3xl leading-tight text-[#5a3b2e] sm:text-4xl">
            {monthsaryHeading}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[#a2805f]">
            A letter for this month
          </p>
        </motion.div>
      )}

      {stage === "petals" && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.2 : 1.1, ease: "easeOut" }}
          onAnimationComplete={() => setStage("letter")}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.25, 0.8, 0.3] }}
            transition={{ duration: petalsDuration, ease: "easeInOut" }}
          />
        </motion.div>
      )}

      {stage === "letter" && (
        <motion.div
          className="absolute flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 10, rotate: -1.6 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 1.2, ease: "easeOut" }}
        >
          <motion.button
            type="button"
            onClick={() => letterReady && setStage("whisper")}
            disabled={!letterReady}
            aria-label={letterReady ? "Reveal monthsary message" : "Wait for the letter to finish unfolding"}
            className="relative w-72 rounded-2xl border border-[#eddcc0] bg-[#fffdf7] p-4 shadow-[0_30px_42px_-30px_rgba(150,112,80,0.45)] sm:w-80"
            initial={{ scaleY: 0.62, originY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: letterDuration, ease: "easeInOut" }}
          >
            {/* The written page.
                The text sits in normal flow, not absolutely positioned. It
                used to be pinned to fixed offsets on top of three decorative
                "handwriting" strokes, which collided as soon as a line wrapped
                — the ruled background is the only rule art now, and every line
                of real text uses `leading-[34px]` so it lands on those rules
                instead of between them. */}
            <div className="relative overflow-hidden rounded-xl bg-[#fff8ec] px-6 py-5">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to bottom, transparent 33px, rgba(160,128,95,0.22) 34px)",
                  backgroundSize: "100% 34px",
                }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, transparent 0%, rgba(240,190,150,0.2) 100%)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: inkDuration, ease: "easeOut" }}
              />

              <div className="relative text-left">
                <motion.p
                  className="font-serif text-lg italic leading-[34px] text-[#6d5240]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: inkDuration,
                    ease: "easeOut",
                    delay: reducedMotion ? 0 : 0.65,
                  }}
                >
                  To my favorite person,
                </motion.p>

                <motion.p
                  className="mt-[34px] text-sm leading-[34px] text-[#6d5240]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: inkDuration,
                    ease: "easeOut",
                    delay: reducedMotion ? 0 : 1.1,
                  }}
                  onAnimationComplete={() => setLetterReady(true)}
                >
                  Thank you for another month of little moments that became everything.
                </motion.p>
              </div>
            </div>
          </motion.button>
          <p className="text-xs uppercase tracking-[0.24em] text-[#a2805f]">
            {letterReady ? "Tap the letter to continue" : "Your letter unfolding"}
          </p>
        </motion.div>
      )}

      {(stage === "petals" || stage === "letter") && (
        <motion.p
          className="pointer-events-none absolute bottom-10 text-xs uppercase tracking-[0.22em] text-[#a2805f]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.7, delay: reducedMotion ? 0 : 0.15 }}
        >
          Let this moment breathe
        </motion.p>
      )}

      {/* The letter is put down and she's just spoken to, one line at a time,
          before the greeting lands. Same beat as the everyday opening — the
          5th should be the richer of the two, never the plainer one. */}
      {stage === "whisper" && (
        <div className="absolute flex min-h-[7rem] max-w-lg items-center justify-center px-4 text-center">
          <WhisperSequence
            lines={monthsaryWhispers}
            reducedMotion={reducedMotion}
            onComplete={() => setStage("revealed")}
            className="font-serif text-3xl italic leading-snug text-[#6d5240] sm:text-4xl"
          />
        </div>
      )}

      {stage === "revealed" && (
        <motion.div
          initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: textDuration, ease: "easeOut" }}
          className="absolute flex max-w-xl flex-col items-center gap-3 px-2 pt-24 text-center sm:pt-28"
        >
          <MonthsaryGarland reducedMotion={reducedMotion} />

          {/* The monthsary greeting is the headline of this scene — the book's
              own title steps down to a byline underneath it. On the 5th, the
              occasion outranks the product name. */}
          <motion.h1
            className="font-serif text-5xl leading-[1.05] text-[#5a3b2e] sm:text-7xl"
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0.25 : 1.5, ease: "easeOut" }}
            style={{ textShadow: "0 2px 24px rgba(247,196,142,0.95)" }}
          >
            {monthsaryHeading}
          </motion.h1>
          <span className="mt-1 text-[11px] uppercase tracking-[0.34em] text-[#c08a63]">
            {title}
            {subtitle ? ` · ${subtitle}` : ""}
          </span>
          <p className="mt-3 max-w-md font-serif text-2xl italic leading-snug text-[#6d5240]">
            {romanticLine}
          </p>
          <button
            type="button"
            onClick={onIntroComplete}
            className="mt-4 rounded-full border border-[#e8b48f] bg-[#fffbf2] px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-[#8a5f45] shadow-[0_8px_18px_-10px_rgba(150,112,80,0.6)] transition hover:scale-[1.03] hover:text-[#5a3b2e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
          >
            Open the chapter
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
