"use client";

import { motion } from "framer-motion";

/**
 * How a visit ends. Two beats, in this order and no other:
 *
 * 1. Reflection — a lot of empty space and one quiet line. Nothing to click.
 *    This is the pause after closing a scrapbook, and it only works if we
 *    resist putting anything useful in it.
 * 2. Looking forward — the story isn't finished, and the next monthsary has
 *    a date. An ending that creates anticipation instead of finality.
 *
 * The date counted toward is the monthsary (the 5th), not the chapter drop
 * (the 1st) — chapters appearing on the 1st is scheduling, but the 5th is the
 * day that is actually theirs, and it is the same day Celebration Mode keys
 * off. See `getNextMonthsaryDate`.
 *
 * Deliberately has no call to action. If a button ever ends up here, the beat
 * is gone.
 */
export function ClosingReflection({
  nextMonthsaryLabel,
  daysUntilNextMonthsary,
}: {
  /** e.g. "September 5" — already formatted server-side. */
  nextMonthsaryLabel: string;
  daysUntilNextMonthsary: number;
}) {
  const forwardLine =
    daysUntilNextMonthsary === 0
      ? "Today is our day."
      : daysUntilNextMonthsary === 1
        ? "Our day is tomorrow."
        : `The next one is ${nextMonthsaryLabel}.`;

  return (
    <motion.section
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-10 px-6 py-28 text-center sm:py-40"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.6, ease: "easeOut" }}
    >
      <p className="ink-legible font-serif text-2xl italic leading-relaxed text-ink sm:text-3xl">
        The rest will keep.
      </p>

      <span
        aria-hidden
        className="h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="flex flex-col gap-2">
        <p className="ink-legible font-serif text-xl text-ink sm:text-2xl">Our story continues.</p>
        <p className="ink-legible text-[11px] font-medium uppercase tracking-[0.28em] text-ink">
          {forwardLine}
        </p>
      </div>
    </motion.section>
  );
}
