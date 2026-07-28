"use client";

import { motion } from "framer-motion";
import { mix, pigment, veil } from "@/lib/ambient/palette";

/**
 * Drawn art for the monthsary greeting: a floral arch that grows over the words.
 *
 * Inline SVG in the same hand as `components/ambient/`, and — since the rebuild
 * that moved the ceremony into the real garden — mixed from the same pigment box
 * rather than from hardcoded hexes. It used to carry its own warm palette on the
 * theory that the 5th "steps outside the page palette for its 30 seconds", which
 * is what left it looking like art from a different app. It now inherits the
 * season and Celebration Mode's golden hour for free, like everything else.
 *
 * This file also used to contain the opening's own sky, clouds, birds and
 * sunrise ridge (`MonthsaryScenery`, `MonthsaryHorizon`). Those are gone: the
 * overlay is transparent now and the real `StorybookSky` shows through it, so
 * there is one painted world instead of two. Don't reintroduce a second one —
 * see the note at the top of `MonthsaryOpening`.
 *
 * Positions are hand-placed along a quadratic arc from (20,124) through control
 * (210,-6) to (400,124) — the leaves sit at evenly spaced `t` values on that
 * curve, which is why they look like they're growing along a vine rather than
 * scattered.
 */

/** Points along the arch, from the left end to the right. */
const VINE = [
  { x: 58, y: 101, angle: -52 },
  { x: 96, y: 82, angle: -40 },
  { x: 134, y: 69, angle: -28 },
  { x: 172, y: 62, angle: -14 },
  { x: 210, y: 59, angle: 0 },
  { x: 248, y: 62, angle: 14 },
  { x: 286, y: 69, angle: 28 },
  { x: 324, y: 82, angle: 40 },
  { x: 362, y: 101, angle: 52 },
];

/** The three blossoms: one at the crown, one on each shoulder. */
const BLOSSOMS = [
  { x: 96, y: 82, r: 9, delay: 0.5 },
  { x: 210, y: 57, r: 13, delay: 0.15 },
  { x: 324, y: 82, r: 9, delay: 0.5 },
];

function Blossom({ r }: { r: number }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((rotation) => (
        <ellipse
          key={rotation}
          cx={0}
          cy={-r * 0.62}
          rx={r * 0.42}
          ry={r * 0.62}
          fill={pigment.blossom}
          transform={`rotate(${rotation})`}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.34} fill={pigment.sunGlow} />
    </g>
  );
}

export function MonthsaryGarland({ reducedMotion }: { reducedMotion: boolean }) {
  const grow = reducedMotion ? 0.01 : 2.4;

  return (
    <svg
      aria-hidden
      viewBox="0 0 420 150"
      className="pointer-events-none absolute -top-4 left-1/2 w-[22rem] -translate-x-1/2 sm:w-[30rem]"
      fill="none"
    >
      {/* the vine itself, drawn on as if by hand */}
      <motion.path
        d="M20 124 Q 210 -6 400 124"
        stroke={veil(pigment.grassDeep, 62)}
        strokeWidth="2.6"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: grow, ease: "easeInOut" }}
      />

      {/* leaves, each unfurling just after the vine reaches it */}
      {VINE.map((leaf, index) => (
        <motion.g
          key={index}
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle})`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reducedMotion ? 0.01 : 0.7,
            delay: reducedMotion ? 0 : 0.25 + index * 0.16,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          style={{ transformOrigin: `${leaf.x}px ${leaf.y}px` }}
        >
          <ellipse cx={0} cy={-11} rx={5.5} ry={10} fill={pigment.grass} />
          <ellipse cx={0} cy={11} rx={4.5} ry={8.5} fill={mix(pigment.grassLit, 70, pigment.grass)} />
        </motion.g>
      ))}

      {/* blossoms last — they're the punctuation */}
      {BLOSSOMS.map((blossom, index) => (
        <motion.g
          key={index}
          transform={`translate(${blossom.x} ${blossom.y})`}
          initial={{ opacity: 0, scale: 0, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            duration: reducedMotion ? 0.01 : 0.9,
            delay: reducedMotion ? 0 : grow * 0.55 + blossom.delay,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          style={{ transformOrigin: `${blossom.x}px ${blossom.y}px` }}
        >
          <Blossom r={blossom.r} />
        </motion.g>
      ))}
    </svg>
  );
}
