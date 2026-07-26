"use client";

import { motion } from "framer-motion";

/**
 * Drawn art for the monthsary greeting: a floral arch that grows over the
 * words, and a sunrise ridge underneath them.
 *
 * Inline SVG in the same hand as `components/ambient/StorybookSky.tsx` — no
 * image assets, so it stays crisp at any size and costs nothing to load. The
 * palette is the scene's own warm hardcoded one rather than the design tokens,
 * because `MonthsaryOpening` deliberately steps outside the page palette for
 * its 30 seconds.
 *
 * Positions are hand-placed along a quadratic arc from (20,124) through
 * control (210,-6) to (400,124) — the leaves sit at evenly spaced `t` values
 * on that curve, which is why they look like they're growing along a vine
 * rather than scattered.
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
          fill="#f6b8c4"
          transform={`rotate(${rotation})`}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.34} fill="#f4cf8a" />
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
        stroke="#b7c99f"
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
          <ellipse cx={0} cy={-11} rx={5.5} ry={10} fill="#a8c194" />
          <ellipse cx={0} cy={11} rx={4.5} ry={8.5} fill="#bcd2a6" />
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

/** A painted cloud, warm-lit from below by the rising sun. */
function Cloud({ opacity }: { opacity: number }) {
  return (
    <svg width="220" height="90" viewBox="0 0 220 90" fill="none" style={{ opacity }}>
      <g fill="#fff6e8">
        <ellipse cx="70" cy="58" rx="58" ry="30" />
        <ellipse cx="120" cy="44" rx="46" ry="34" />
        <ellipse cx="160" cy="60" rx="44" ry="26" />
        <ellipse cx="98" cy="66" rx="52" ry="22" />
      </g>
      <g fill="#f8c98f" opacity="0.5">
        <ellipse cx="98" cy="76" rx="60" ry="10" />
        <ellipse cx="158" cy="72" rx="34" ry="8" />
      </g>
    </svg>
  );
}

/**
 * The scenery the whole monthsary opening takes place inside — sky, clouds,
 * birds, and the sunrise ridge — rendered from the very first beat rather
 * than only at the greeting.
 *
 * This exists because the opening is an opaque full-screen overlay: it covers
 * `StorybookSky`, so without its own scenery the first twenty seconds of the
 * most important screen in the app were a bare gradient.
 *
 * Sits at the back of the scene; everything interactive stacks above it.
 */
export function MonthsaryScenery({ reducedMotion }: { reducedMotion: boolean }) {
  const clouds = [
    { top: "8%", left: "6%", scale: 0.9, duration: 168, delay: -30, opacity: 0.95 },
    { top: "17%", left: "62%", scale: 0.58, duration: 131, delay: -88, opacity: 0.75 },
    { top: "4%", left: "78%", scale: 0.72, duration: 205, delay: -150, opacity: 0.6 },
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {clouds.map((cloud, index) => (
        <div
          key={index}
          className="ambient-cloud absolute"
          style={{
            top: cloud.top,
            left: cloud.left,
            animation: reducedMotion
              ? undefined
              : `cloud-drift ${cloud.duration}s linear infinite`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <div style={{ transform: `scale(${cloud.scale})` }}>
            <Cloud opacity={cloud.opacity} />
          </div>
        </div>
      ))}

      <div
        className="ambient-bird absolute"
        style={{
          top: "24%",
          left: "20%",
          opacity: 0.55,
          animation: reducedMotion ? undefined : "bird-fly 52s linear infinite",
          animationDelay: "-8s",
        }}
      >
        <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
          {[
            { x: 0, y: 10, s: 1 },
            { x: 34, y: 0, s: 0.78 },
            { x: 60, y: 18, s: 0.62 },
          ].map((bird, index) => (
            <g
              key={index}
              transform={`translate(${bird.x} ${bird.y}) scale(${bird.s})`}
              className="ambient-wing"
              style={{
                transformOrigin: "center",
                animation: reducedMotion
                  ? undefined
                  : `bird-flap ${0.42 + index * 0.09}s ease-in-out infinite`,
              }}
            >
              <path
                d="M0 10 Q 9 0 18 9 Q 27 0 36 10"
                stroke="#a8724f"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
          ))}
        </svg>
      </div>

      <MonthsaryHorizon reducedMotion={reducedMotion} />
    </div>
  );
}

/**
 * The ridge the greeting stands on: a rising sun and two soft hills, so the
 * words have a horizon under them instead of floating in a gradient.
 */
export function MonthsaryHorizon({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 1440 260"
      preserveAspectRatio="none"
      className="pointer-events-none absolute bottom-0 left-0 w-full"
      style={{ height: "34vh", minHeight: "180px" }}
      fill="none"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0.2 : 2.4, ease: "easeOut" }}
    >
      {/* sun, half-set behind the far hill */}
      <circle cx="1080" cy="150" r="96" fill="#f8c98f" opacity="0.85" />
      <circle cx="1080" cy="150" r="150" fill="#f8c98f" opacity="0.28" />

      <path
        d="M0 168 C 200 112 380 190 560 158 C 740 126 900 70 1090 108 C 1250 140 1350 126 1440 104 L1440 260 L0 260 Z"
        fill="#f0c6a0"
      />
      <path
        d="M0 208 C 220 166 400 220 600 200 C 800 180 940 140 1140 172 C 1300 198 1370 192 1440 178 L1440 260 L0 260 Z"
        fill="#e8ab86"
      />
      <path
        d="M0 240 C 180 216 360 248 560 238 C 760 228 900 202 1100 226 C 1280 248 1360 244 1440 232 L1440 260 L0 260 Z"
        fill="#d98f6d"
      />
    </motion.svg>
  );
}
