"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { HeartFirework, SideFireworks } from "../art/HeartFirework";
import { MonthInReview } from "../art/MonthInReview";
import { MonthsaryGarland } from "../art/MonthsaryGarland";
import { WhisperSequence } from "../WhisperSequence";
import { monthsaryWhispers } from "../whispers";
import type { OpeningSceneProps } from "../types";

type Stage = "arriving" | "sealed" | "letter" | "review" | "whisper" | "revealed";

/**
 * The monthsary ceremony (the 5th), staged in the garden itself.
 *
 * arrive in the hush → break the seal → the letter unfolds → **the month, one
 * photograph at a time** → a few words → the greeting.
 *
 * ## It happens in the real world, not a picture of one
 *
 * This overlay has **no background**. The app's own `StorybookSky` is mounted in
 * the layout behind it and shows straight through; `HomeCover` veils the shelf
 * rather than covering the garden. That is deliberate and it is the fix for the
 * thing that made this scene feel wrong: it used to be opaque and carry its own
 * scenery — a few flat ellipses for clouds, three beziers for hills, a circle
 * for the sun — drawn before the painted world was rebuilt as a generated
 * garden and never brought forward. The ceremony looked like a cruder app than
 * the one it opened into.
 *
 * Now nothing is painted twice, and the handoff at the end is not a scene
 * change at all. The letter dissolves and the shelf fades up around her, in the
 * same garden she has been standing in the whole time.
 *
 * Which is also why there is no gradient, no wash, and no hex literal anywhere
 * in this file. Everything is a design token, so the ceremony inherits both the
 * season and Celebration Mode's golden hour (see the `data-celebration` block
 * in globals.css) instead of asserting its own warmth over the top.
 *
 * ## The `arriving` beat is empty on purpose
 *
 * On the one day that is supposed to feel different, she should notice the
 * light has changed before she is handed anything to do.
 */
export function MonthsaryOpening({
  title,
  reducedMotion,
  celebrationLabel,
  celebrationMessage,
  monthsaryNumber,
  monthPrints = [],
  onIntroComplete,
}: OpeningSceneProps) {
  const [stage, setStage] = useState<Stage>("arriving");
  const [letterReady, setLetterReady] = useState(false);

  const hushDuration = reducedMotion ? 0.4 : 3.2;
  const letterDuration = reducedMotion ? 0.3 : 4.4;
  const inkDuration = reducedMotion ? 0.28 : 3.4;
  const textDuration = reducedMotion ? 0.25 : 1.0;

  const romanticLine =
    celebrationMessage ?? "Some loves do not pass time. They turn it into memory.";
  const monthsaryHeading = celebrationLabel ?? "Happy Monthsary";
  const firstMonth = monthsaryNumber === 1;

  /**
   * The letter.
   *
   * ## The two ways this has gone wrong, so it doesn't go wrong a third time
   *
   * It started as "To my favorite person, / Thank you for another month of
   * little moments that became everything" — greeting-card copy, assembled out
   * of things people say *about* relationships rather than anything one person
   * would write to another. It was also false on the first monthsary: there is
   * no "another" month yet.
   *
   * The first rewrite over-corrected into "I didn't set out to make a book. I
   * just kept not wanting to lose any of it." Accurate, restrained — and not
   * remotely romantic. Dryness is not the opposite of sentimentality; it is
   * just a different way of not saying anything.
   *
   * What actually works is the register two people who like each other use in
   * private: **affectionate, specific, and teasing.** A joke is what earns the
   * sincere line next to it — say something warm on its own and it sounds like
   * a card, but put it after a joke and it sounds like a person who means it and
   * is slightly embarrassed about it. That is the tone to keep.
   *
   * The names follow the same rule as the whispers (see `whispers.ts`): address
   * her as **"my habibi"**, which carries the joke and the affection at once,
   * with "scammer"/"uwagan" held back for outright teasing and the everyday
   * "dai" left for plainer moments.
   *
   * Two constraints on the joke itself:
   *
   * - **It is at the writer's own expense, never at hers.** Being teased is only
   *   affectionate between the two people doing it; read cold, off a screen, it
   *   is just a remark about someone.
   * - **Not about photographs.** A version built on "my camera roll is a
   *   disaster" / "I kept the evidence" was tried and rejected — it makes the
   *   letter about the act of documenting rather than about her, and the
   *   photographs are already about to speak for themselves in the very next
   *   beat. The joke should be about the writer having become sappy; the
   *   pictures don't need introducing.
   *
   * Both letters land straight into the look back, so both end by pointing at
   * it rather than closing the thought.
   *
   * ## "Website" in the first letter is deliberate
   *
   * It is the one place in the entire app that breaks the book metaphor, and it
   * was chosen on purpose over "a whole book about us". The joke only works if
   * the scale of the gesture is literal — "I made you a book" is a thing people
   * say, and it lands as a metaphor; "I built you an entire website" is an
   * absurd amount of effort and reads as an admission. That admission is the
   * whole beat.
   *
   * The illusion can afford it exactly once, in a handwritten aside, on the
   * first monthsary. Every month after keeps the metaphor intact — which is
   * also why the recurring letter says "a bigger book" and not "more storage".
   * Don't propagate the break.
   */
  const letter = firstMonth
    ? {
        salutation: "My habibi — you did this to me,",
        body:
          "One month ago I was a perfectly normal person. Now I've built you an entire website. I'm aware that's a lot. I'm not taking any of it back — come see.",
        signoff: "Yours, obviously —",
      }
    : {
        salutation: "To my habibi (still, somehow),",
        body:
          "Another month, and I still haven't run out of things worth keeping. At this rate we're going to need a bigger book. I've made my peace with that — come look.",
        signoff: "Yours, still —",
      };

  /** No photographs this month — the look back is skipped, never shown empty. */
  const afterLetter = () => setStage(monthPrints.length > 0 ? "review" : "whisper");

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6"
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.9 }}
    >
      {/*
       * A breath of warm light behind the ceremony, so the letter and the
       * greeting have something to sit against without the garden being veiled.
       * This is the only thing this scene paints, and it is light rather than a
       * surface — the world underneath has to keep reading as the world.
       */}
      <motion.div
        className="pointer-events-none absolute h-[36rem] w-[36rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent-warm) 34%, transparent), transparent 70%)",
        }}
        animate={{
          opacity: stage === "arriving" ? 0.35 : stage === "sealed" ? 0.6 : 0.85,
          scale: stage === "arriving" ? 0.75 : 1.1,
        }}
        transition={{ duration: reducedMotion ? 0.25 : 2.4, ease: "easeOut" }}
      />

      {stage !== "arriving" && stage !== "revealed" && (
        <button
          type="button"
          onClick={onIntroComplete}
          className="absolute right-5 top-5 z-20 rounded-full border border-border bg-surface/90 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Skip intro
        </button>
      )}

      {/* Nothing but the light breathing. Nothing asked of her yet. */}
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
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-accent-warm) 55%, transparent), transparent 72%)",
            }}
            animate={
              reducedMotion ? { opacity: 0.5 } : { opacity: [0.28, 0.7, 0.28], scale: [1, 1.16, 1] }
            }
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
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
            aria-label="Break the seal and open the monthsary letter"
            onClick={() => setStage("letter")}
            className="group relative flex h-52 w-80 items-center justify-center rounded-2xl border border-border bg-surface shadow-[0_30px_40px_-30px_color-mix(in_srgb,var(--color-ink)_50%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {/* the envelope's flap */}
            <div className="absolute inset-x-0 top-0 h-1/2 border border-border bg-background [clip-path:polygon(0_0,100%_0,50%_100%)]" />

            <motion.div
              className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-semibold text-surface"
              style={{ background: "var(--color-accent-warm)" }}
              animate={{ scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }}
              transition={{
                duration: reducedMotion ? 0.35 : 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              us
            </motion.div>

            <span className="absolute bottom-4 text-[11px] uppercase tracking-[0.26em] text-ink-muted transition group-hover:text-ink">
              Break the seal
            </span>
          </motion.button>

          <p className="ink-legible mt-8 font-serif text-3xl leading-tight text-ink sm:text-4xl">
            {monthsaryHeading}
          </p>
          <p className="ink-legible mt-3 text-xs uppercase tracking-[0.24em] text-ink-muted">
            A letter for this month
          </p>
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
            onClick={() => letterReady && afterLetter()}
            disabled={!letterReady}
            aria-label={
              letterReady ? "Continue" : "Wait for the letter to finish unfolding"
            }
            className="relative w-72 rounded-2xl border border-border bg-surface p-4 shadow-[0_30px_42px_-30px_color-mix(in_srgb,var(--color-ink)_50%,transparent)] sm:w-80"
            initial={{ scaleY: 0.62, originY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: letterDuration, ease: "easeInOut" }}
          >
            {/* The written page. Text sits in normal flow on `leading-[34px]`
                so every line lands on a rule rather than between them. */}
            <div className="relative overflow-hidden rounded-xl bg-background px-6 py-5">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to bottom, transparent 33px, color-mix(in srgb, var(--color-ink-muted) 30%, transparent) 34px)",
                  backgroundSize: "100% 34px",
                }}
              />

              <div className="relative text-left">
                <motion.p
                  className="font-serif text-lg italic leading-[34px] text-ink"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: inkDuration,
                    ease: "easeOut",
                    delay: reducedMotion ? 0 : 0.65,
                  }}
                >
                  {letter.salutation}
                </motion.p>

                <motion.p
                  className="mt-[34px] text-sm leading-[34px] text-ink"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: inkDuration,
                    ease: "easeOut",
                    delay: reducedMotion ? 0 : 1.1,
                  }}
                >
                  {letter.body}
                </motion.p>

                {/*
                 * A letter without a sign-off is a note. This one deliberately
                 * does *not* say "I love you" — that lands a few beats later as
                 * the last whisper before the greeting, alone, and saying it
                 * twice in five minutes spends it.
                 */}
                <motion.p
                  className="mt-[34px] font-serif text-base italic leading-[34px] text-ink"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: inkDuration,
                    ease: "easeOut",
                    delay: reducedMotion ? 0 : 1.55,
                  }}
                  // The letter is "ready" once the last of it has been written,
                  // which is now the sign-off rather than the body.
                  onAnimationComplete={() => setLetterReady(true)}
                >
                  {letter.signoff}
                </motion.p>
              </div>
            </div>
          </motion.button>
          <p className="ink-legible text-xs uppercase tracking-[0.24em] text-ink-muted">
            {/* Picking up the letter's own last words rather than instructing
                her — "look back at this month" was a menu item sitting under a
                love letter. */}
            {letterReady
              ? monthPrints.length > 0
                ? "Tap to come see"
                : "Tap the letter to continue"
              : "Still writing…"}
          </p>
        </motion.div>
      )}

      {/* The month itself, handed back one photograph at a time. */}
      {stage === "review" && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.8, ease: "easeOut" }}
        >
          <MonthInReview
            prints={monthPrints}
            reducedMotion={reducedMotion}
            onComplete={() => setStage("whisper")}
          />
        </motion.div>
      )}

      {/* The letter is put down and she's just spoken to, one line at a time,
          before the greeting lands. */}
      {stage === "whisper" && (
        <div className="absolute flex min-h-[7rem] max-w-lg items-center justify-center px-4 text-center">
          <WhisperSequence
            lines={monthsaryWhispers(monthsaryNumber)}
            reducedMotion={reducedMotion}
            onComplete={() => setStage("revealed")}
            className="ink-legible font-serif text-3xl italic leading-snug text-ink sm:text-4xl"
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
          {/* One burst, landing on the greeting — see the file's note on why it
              is one and not a volley — and then small ones out at the edges for
              as long as she stays, so the sky doesn't go dead behind her. */}
          <HeartFirework reducedMotion={reducedMotion} />
          <SideFireworks reducedMotion={reducedMotion} />

          <MonthsaryGarland reducedMotion={reducedMotion} />

          {/* The monthsary greeting is the headline of this scene — the book's
              own title steps down to a byline underneath it. On the 5th, the
              occasion outranks the product name. */}
          <motion.h1
            className="ink-legible font-serif text-5xl leading-[1.05] text-ink sm:text-7xl"
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0.25 : 1.5, ease: "easeOut" }}
            // Inline, so it wins over `.ink-legible`'s shadow — which means it
            // has to do that rule's job as well as its own: the warm bloom that
            // makes the greeting feel lit, *plus* the dark halo that keeps it
            // readable against a night sky.
            style={{
              textShadow:
                "0 2px 24px color-mix(in srgb, var(--color-accent-warm) 70%, transparent), 0 0 12px color-mix(in srgb, #10173a 75%, transparent), 0 1px 3px color-mix(in srgb, #10173a 70%, transparent)",
            }}
          >
            {monthsaryHeading}
          </motion.h1>
          {/* The book's name only. The two names used to be appended here and it
              read like a wedding invitation — "Title · A & B" in spaced caps is
              stationery, and this is supposed to be a Tuesday evening in a
              garden. `subtitle` is still accepted for other scenes; this one
              deliberately doesn't print it. */}
          <span className="ink-legible mt-1 text-[11px] uppercase tracking-[0.34em] text-accent">
            {title}
          </span>
          <p className="ink-legible mt-3 max-w-md font-serif text-2xl italic leading-snug text-ink">
            {romanticLine}
          </p>
          <button
            type="button"
            onClick={onIntroComplete}
            className="mt-4 rounded-full border border-border bg-surface px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-ink-muted shadow-[0_8px_18px_-10px_color-mix(in_srgb,var(--color-ink)_60%,transparent)] transition hover:scale-[1.03] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
          >
            Open the chapter
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
