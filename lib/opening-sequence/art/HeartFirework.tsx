"use client";

import { motion } from "framer-motion";
import { pigment, veil } from "@/lib/ambient/palette";

/**
 * One heart, bursting over the meadow exactly as the greeting lands.
 *
 * ## One, and only one
 *
 * A volley was the obvious version and it is the wrong one. Nothing else in
 * this book raises its voice — the clouds take nine minutes to cross, the swing
 * is still settling from someone getting up — and a barrage of fireworks would
 * instantly be the loudest thing in the project by a wide margin, which would
 * make the greeting it is supposed to be punctuating into the *quiet* part of
 * its own scene. A single burst is a full stop at the end of a sentence. More
 * would be applause for itself.
 *
 * It is timed to the greeting rather than played underneath it for the same
 * reason: it is punctuation, so it has to land *on* the words.
 *
 * ## How the heart is drawn
 *
 * Not a heart-shaped sprite that scales up — that reads as a sticker. The
 * shell climbs, and at apogee the *sparks* are what form the heart: each one
 * flies from the centre to its own point on a parametric heart curve
 * (`16sin³t`, the standard one), then falls, fading. So the shape only exists
 * as an arrangement of embers, which is both how a real shell works and the
 * only version of this that looks drawn by the same hand as the rest.
 *
 * The curve is sampled at build time into `SPARKS` — it never needs to be
 * recomputed, and hard-coding the sampling keeps the burst identical every
 * month, like everything else in this world.
 */

/** Points on `x = 16sin³t`, `y = 13cos t − 5cos 2t − 2cos 3t − cos 4t`. */
const SPARKS = Array.from({ length: 34 }, (_, i) => {
  const t = (i / 34) * Math.PI * 2;
  const sin = Math.sin(t);
  return {
    id: i,
    // Scaled to a comfortable burst radius, y flipped for screen coordinates.
    x: 16 * sin * sin * sin * 5.2,
    y:
      -(
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)
      ) * 5.2,
  };
});

/**
 * Small bursts out at the edges, going on for as long as she stays.
 *
 * The heart is a full stop, and a full stop happens once — but the greeting is a
 * screen someone can sit on for a while, and a sky that fires once and then goes
 * completely dead makes the moment feel like it has already finished without
 * her. These keep the evening going.
 *
 * They **flank the greeting** rather than hugging the screen edges. Pushed out
 * to the far corners they were technically present and effectively invisible —
 * peripheral vision at the moment the reader is looking dead centre at the
 * words. Close in, they are part of the same picture as the greeting, which is
 * the point of having them at all.
 *
 * Two things still keep them from competing with the heart they follow:
 *
 * - **They stay out of the text column.** `SIDES` sits them either side of the
 *   centred greeting, so they burst *beside* the words rather than behind them.
 * - **They never sync.** Each has its own `repeatDelay` and offset, all
 *   coprime-ish, so the group never resolves into a rhythm — the same rule the
 *   ambient garden's creatures follow.
 *
 * The first is delayed past the heart's own animation so it cannot step on it.
 */
const SIDES = [
  { left: "24%", top: "24%", delay: 4.4, gap: 3.9, scale: 1, hue: 0 },
  { left: "76%", top: "19%", delay: 6.1, gap: 4.7, scale: 0.9, hue: 1 },
  { left: "29%", top: "46%", delay: 8.3, gap: 5.3, scale: 0.75, hue: 1 },
  { left: "72%", top: "42%", delay: 5.7, gap: 6.2, scale: 0.85, hue: 0 },
];

/** Embers on a circle — a plain spherical shell, not a heart. */
const SPRAY = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return { id: i, x: Math.cos(a) * 52, y: Math.sin(a) * 52 };
});

export function SideFireworks({ reducedMotion }: { reducedMotion: boolean }) {
  // Nothing here carries meaning the greeting doesn't already carry, so under
  // reduced motion it simply doesn't play — unlike the heart, which still
  // arrives formed because it is punctuation.
  if (reducedMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {SIDES.map((side) => (
        <div key={side.left + side.top} className="absolute" style={{ left: side.left, top: side.top }}>
          {SPRAY.map((spark, i) => (
            <motion.span
              key={spark.id}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                background: side.hue === 0 ? pigment.blossom : pigment.lantern,
                boxShadow: `0 0 10px ${veil(
                  side.hue === 0 ? pigment.blossom : pigment.lantern,
                  90,
                )}`,
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
              animate={{
                x: [0, spark.x * side.scale, spark.x * side.scale * 1.1],
                y: [0, spark.y * side.scale, spark.y * side.scale + 26],
                opacity: [0, 1, 0.75, 0],
                scale: [0.3, 1.1, 0.7],
              }}
              transition={{
                duration: 2.4,
                delay: side.delay + (i % 4) * 0.02,
                repeat: Infinity,
                repeatDelay: side.gap,
                ease: "easeOut",
                times: [0, 0.25, 0.6, 1],
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HeartFirework({ reducedMotion }: { reducedMotion: boolean }) {
  /**
   * Under reduced motion the heart still *happens* — it simply arrives already
   * formed and fades, rather than being launched. The resting state of this
   * scene has to still contain a firework; the guardrail is that reduced-motion
   * readers keep the semantic beat, not that they lose it.
   */
  if (reducedMotion) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[18vh] flex justify-center">
        <motion.div
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.9] }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {SPARKS.map((spark) => (
            <span
              key={spark.id}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                left: spark.x,
                top: spark.y,
                background: pigment.blossom,
                boxShadow: `0 0 8px ${veil(pigment.blossom, 80)}`,
              }}
            />
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[18vh] flex justify-center">
      <div className="relative">
        {/* The shell going up: a small warm streak, gone at apogee. */}
        <motion.span
          className="absolute h-2 w-2 rounded-full"
          style={{
            background: pigment.sparkle,
            boxShadow: `0 0 12px ${veil(pigment.lantern, 90)}`,
          }}
          initial={{ y: 260, opacity: 0, scale: 0.6 }}
          animate={{ y: [260, 0], opacity: [0, 1, 1, 0], scale: [0.6, 1, 0.9] }}
          transition={{ duration: 1.1, ease: "easeOut", times: [0, 0.2, 0.85, 1] }}
        />

        {/* The flash at the moment it opens. */}
        <motion.span
          className="absolute -left-24 -top-24 h-48 w-48 rounded-full"
          style={{
            background: `radial-gradient(circle, ${veil(pigment.sparkle, 85)}, ${veil(
              pigment.blossom,
              30,
            )} 45%, transparent 70%)`,
          }}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.4, 1.8] }}
          transition={{ duration: 1.1, delay: 1.05, ease: "easeOut" }}
        />

        {/* The heart, written in embers. */}
        {SPARKS.map((spark, i) => (
          <motion.span
            key={spark.id}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{
              // Alternating so the outline reads as two colours of ember rather
              // than as a solid drawn line.
              background: i % 3 === 0 ? pigment.lantern : pigment.blossom,
              boxShadow: `0 0 8px ${veil(i % 3 === 0 ? pigment.lantern : pigment.blossom, 80)}`,
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              // Out to the heart, then a slow sag as the embers cool and fall.
              x: [0, spark.x, spark.x * 1.08],
              y: [0, spark.y, spark.y + 54],
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1, 0.7],
            }}
            transition={{
              duration: 2.9,
              delay: 1.05 + (i % 5) * 0.012,
              ease: "easeOut",
              times: [0, 0.22, 0.62, 1],
            }}
          />
        ))}
      </div>
    </div>
  );
}
