"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
 * borrowed from a gallery app. There are no dots-as-buttons, no arrows, no
 * counter: nothing to *look at* as a control.
 *
 * ## Pacing is now hers, not a timer's
 *
 * This used to auto-advance on a fixed hold per print. It now waits: swipe the
 * print in any direction — up or left brings the next one forward, down or
 * right goes back — or scroll/wheel. The point of the change is that turning
 * the page yourself is a small act of attention a timer can't replicate — you
 * spend exactly as long on a photograph as it's worth to you, and the moment
 * of pulling the next one into place is a beat of its own instead of scenery
 * going by. Tapping the left or right half of the frame works too, for anyone
 * who doesn't reach for the gesture — same split every story-style UI uses,
 * so a tap's meaning never depends on exactly where it landed on the photo.
 *
 * The tilt alternates left/right by index rather than being random, so
 * consecutive prints visibly *replace* each other instead of appearing to
 * wobble in place, and so the sequence is the same every time it plays.
 */

/** Deterministic, alternating — never random. */
const TILTS = [-2.2, 1.8, -1.2, 2.4, -1.9, 1.3, -2.6];

/** How far a swipe/drag has to travel, in px, before it counts as a page turn rather than a wobble. */
const DRAG_THRESHOLD = 70;
/** How strong a wheel/trackpad gesture has to be before it counts, so an idle scroll doesn't skip a photo. */
const WHEEL_THRESHOLD = 24;
/** Guards against one gesture firing more than one advance while state/animation catches up. */
const GESTURE_COOLDOWN_MS = 380;

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
  const cooling = useRef(false);

  useEffect(() => {
    if (prints.length === 0) onComplete();
    // Only ever relevant on mount — `prints` is a fixed prop for the life of the ceremony.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cool() {
    cooling.current = true;
    window.setTimeout(() => {
      cooling.current = false;
    }, GESTURE_COOLDOWN_MS);
  }

  function goNext() {
    if (cooling.current) return;
    cool();
    if (index >= prints.length - 1) onComplete();
    else setIndex((current) => current + 1);
  }

  function goPrev() {
    if (cooling.current) return;
    if (index === 0) return;
    cool();
    setIndex((current) => Math.max(0, current - 1));
  }

  function handleWheel(event: React.WheelEvent) {
    if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
    if (event.deltaY > 0) goNext();
    else goPrev();
  }

  /** Whichever axis moved further decides the direction, so a mostly-diagonal drag doesn't fire both. Up/left = forward, down/right = back — matching the same "right is forward" sense the tap zones use. */
  function handleDragEnd(_: unknown, info: PanInfo) {
    const { x, y } = info.offset;
    const offset = Math.abs(x) > Math.abs(y) ? x : y;
    if (offset < -DRAG_THRESHOLD) goNext();
    else if (offset > DRAG_THRESHOLD) goPrev();
  }

  /** Left half of the frame goes back, right half goes forward — the same split every story-style UI uses, so a tap always has an unambiguous meaning regardless of where on the photo it lands. */
  function handleTap(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const tappedLeftHalf = event.clientX - rect.left < rect.width / 2;
    if (tappedLeftHalf) goPrev();
    else goNext();
  }

  if (prints.length === 0) return null;

  const print = prints[index];
  const tilt = TILTS[index % TILTS.length];

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6"
      onWheel={handleWheel}
      onClick={handleTap}
    >
      <div className="relative flex h-[54vh] w-full max-w-sm items-center justify-center">
        {/* `mode="popLayout"` so the outgoing print keeps its place while the
            incoming one settles — with the default mode they briefly stack and
            the whole group jumps. */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={print.id}
            className="absolute w-full cursor-grab rounded-2xl bg-surface p-3 pb-5 shadow-[0_30px_50px_-28px_color-mix(in_srgb,var(--color-ink)_55%,transparent)] active:cursor-grabbing"
            drag={reducedMotion ? false : true}
            dragElastic={0.6}
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            style={{ touchAction: "none" }}
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

      {/* A one-time nudge toward the gesture, gone the moment she's used it —
          reappearing on every photo would turn a hint into an instruction. */}
      {index === 0 && (
        <motion.p
          className="ink-legible text-[11px] uppercase tracking-[0.24em] text-ink-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          Swipe, scroll, or tap either side
        </motion.p>
      )}
    </div>
  );
}
