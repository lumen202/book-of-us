"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatFullDate } from "@/lib/format/date";
import type { MonthPrint } from "../types";

/**
 * The month, handed back one photograph at a time.
 *
 * This is the beat the whole ceremony is building toward. Everything before it
 * — the seal, the letter — is someone speaking; this is them showing you what
 * they meant. A monthsary greeting that only ever says "another month" is a
 * greeting card. One that says it while laying your own month out in front of
 * you is the thing this book is for.
 *
 * ## Why prints and not a carousel
 *
 * Each photo arrives as a *mounted print* — white mat, photo corners, a slight
 * tilt, settling into place — the same object the album pages are made of, so
 * the ceremony is showing her the book's own vocabulary rather than a widget
 * borrowed from a gallery app. There are no dots, no arrows, no counter and
 * nothing to swipe: it plays, at its own pace, like someone turning a stack of
 * prints toward you. Controls would make it a thing to operate.
 *
 * ## Pacing
 *
 * One print at a time, cross-fading, `HOLD_MS` each. Long enough to actually
 * look at a photograph and much longer than a slideshow would normally sit —
 * the guardrail is emotional pacing over feature density, and a fast cut
 * through eight photos communicates "here is a lot of content" rather than
 * "look at this one".
 *
 * The tilt alternates left/right by index rather than being random, so
 * consecutive prints visibly *replace* each other instead of appearing to
 * wobble in place, and so the sequence is the same every time it plays.
 */

/** How long each print stays up. See the pacing note above. */
const HOLD_MS = 2600;
const HOLD_MS_REDUCED = 1100;

/** Deterministic, alternating — never random. */
const TILTS = [-2.2, 1.8, -1.2, 2.4, -1.9, 1.3, -2.6];

export function MonthInReview({
  prints,
  reducedMotion,
  onComplete,
}: {
  prints: MonthPrint[];
  reducedMotion: boolean;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const hold = reducedMotion ? HOLD_MS_REDUCED : HOLD_MS;

  /**
   * A timer is right here, unlike everywhere else in the opening sequence.
   *
   * The other scenes chain on `onAnimationComplete` because they are waiting
   * for *animations* to finish and a parallel `setTimeout` would drift out of
   * sync with them. This beat is waiting for a **reading duration** — how long
   * a person needs to look at a photograph — which is not the length of any
   * animation and has nothing to advance off. So it is an interval, and the
   * cleanup is what keeps it honest if the reader skips out mid-sequence.
   */
  useEffect(() => {
    if (prints.length === 0) {
      onComplete();
      return;
    }

    const timer = window.setTimeout(() => {
      if (index >= prints.length - 1) onComplete();
      else setIndex((current) => current + 1);
    }, hold);

    return () => window.clearTimeout(timer);
  }, [index, prints.length, hold, onComplete]);

  if (prints.length === 0) return null;

  const print = prints[index];
  const tilt = TILTS[index % TILTS.length];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
      <div className="relative flex h-[54vh] w-full max-w-sm items-center justify-center">
        {/* `mode="popLayout"` so the outgoing print keeps its place while the
            incoming one settles — with the default mode they briefly stack and
            the whole group jumps. */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={print.id}
            className="absolute w-full rounded-2xl bg-surface p-3 pb-5 shadow-[0_30px_50px_-28px_color-mix(in_srgb,var(--color-ink)_55%,transparent)]"
            initial={{
              opacity: 0,
              scale: reducedMotion ? 1 : 0.94,
              rotate: reducedMotion ? 0 : tilt * 2.2,
            }}
            animate={{ opacity: 1, scale: 1, rotate: reducedMotion ? 0 : tilt }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.98 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.9, ease: "easeOut" }}
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink/5">
              <Image
                src={print.url}
                alt=""
                fill
                unoptimized
                draggable={false}
                sizes="(min-width: 640px) 384px, 88vw"
                className="object-cover"
                // The ceremony is a fixed sequence, so the next print is always
                // known — and a photograph that fades in half-loaded breaks the
                // one beat that is supposed to feel like a gift.
                priority
              />
              {/* The same photo-corner mounts the album pages use. */}
              {[
                "left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]",
                "right-0 top-0 [clip-path:polygon(100%_0,100%_100%,0_0)]",
                "bottom-0 left-0 [clip-path:polygon(0_100%,0_0,100%_100%)]",
                "bottom-0 right-0 [clip-path:polygon(100%_100%,0_100%,100%_0)]",
              ].map((corner) => (
                <span key={corner} aria-hidden className={`absolute h-5 w-5 bg-ink/15 ${corner}`} />
              ))}
            </div>

            <figcaption className="mt-3 px-1 text-center">
              <span className="block font-serif text-lg italic leading-tight text-ink">
                {print.title}
              </span>
              <time
                dateTime={print.occurredAt}
                className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-ink-muted"
              >
                {formatFullDate(print.occurredAt)}
              </time>
            </figcaption>
          </motion.div>
        </AnimatePresence>
      </div>

      {/*
       * How far through, as a row of marks rather than "3 / 7". A count is a
       * progress bar and turns the beat into something being got through; a row
       * of prints filling in reads as a stack being laid down, and it is the
       * only thing on screen admitting there is more than one.
       */}
      <div className="flex items-center gap-1.5">
        {prints.map((item, i) => (
          <motion.span
            key={item.id}
            className="h-1 rounded-full bg-ink"
            animate={{
              opacity: i <= index ? 0.42 : 0.13,
              width: i === index ? 18 : 6,
            }}
            transition={{ duration: reducedMotion ? 0.15 : 0.5, ease: "easeOut" }}
          />
        ))}
      </div>
    </div>
  );
}
