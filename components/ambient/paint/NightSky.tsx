"use client";

import { TRAVEL } from "@/lib/ambient/depth";
import { useMeteors } from "@/lib/ambient/useMeteors";
import { pigment, veil } from "@/lib/ambient/palette";
import { makeRng } from "@/lib/ambient/rng";
import { useCelebrating } from "@/lib/celebration/useCelebrating";
import { useNightPreview } from "@/lib/night-preview/NightPreviewProvider";

/**
 * The stars and the moon — the 5th only.
 *
 * ## Why it is always rendered
 *
 * `opacity: 0` by default, brought up by the single
 * `[data-celebration="true"] .night-sky` rule in globals.css. Whether today is
 * a celebration is a *client-only* question — the dev override lives in
 * localStorage, which the server cannot see — so a conditional render here
 * would hydrate differently than it server-rendered. Rendering it always and
 * revealing it in CSS keeps one markup for both, the same trick the lit lantern
 * flames in `HillRange` use.
 *
 * It costs a handful of static circles and no animation frames while hidden.
 *
 * ## The moon is not a disc with a bite out of it
 *
 * It is a soft full moon with a wide halo and a couple of faint maria, because
 * a hard-edged crescent is a weather-app icon. The halo is doing most of the
 * work: it is what makes the sky read as *lit from up there* rather than as a
 * sticker on a gradient, and it is what the meadow's cool highlights are
 * nominally coming from.
 *
 * ## Seeded, like everything else in the world
 *
 * `makeRng`, never `Math.random()` — the stars have to survive the server/client
 * boundary identically, and it should be the same sky every 5th. The
 * irregularity is the point; novelty is not.
 *
 * ## Meteors are the one thing here that isn't always-rendered
 *
 * Unlike the stars/moon (static, free while hidden), meteors are occasional
 * timed events — see `useMeteors`. Running those timers every day, hidden or
 * not, would cost nothing to look at but would still be live JS timers ticking
 * in the background of every ordinary visit, so they're gated on `active`
 * (Celebration Mode or the Settings night-view preview) rather than rendered
 * unconditionally like everything else in this file. That gate is decided
 * entirely inside `useMeteors`'s effect, after mount, so it introduces no
 * hydration risk of its own — first paint always shows zero meteors, server
 * and client alike.
 */

const STAR_SEED = 50505;

/**
 * A properly populated sky.
 *
 * This was 64, which is roughly what a city gives you: a scattering of dots
 * that reads as "some stars have been placed here". The garden is not in a
 * city. What makes a night sky feel *deep* is not a handful of bright points
 * but the dim ones crowded behind them — density is the depth cue, the same way
 * the difference in movement between near and far grass is the meadow's.
 *
 * Most of these are therefore faint and small on purpose. Read the distribution
 * below as three populations rather than one: a dense dim field, a smaller mid
 * layer, and a few genuinely bright stars. A uniform random size range would
 * have produced a sky of identical medium stars, which is the same flatness the
 * canopy's three tonal bands exist to avoid.
 */
const STAR_COUNT = 260;

/**
 * How many of them actually twinkle.
 *
 * Deliberately not all, for two independent reasons that happen to agree.
 *
 * A whole sky pulsing reads as a screensaver — real twinkling is atmospheric
 * and shows mostly on the brighter stars, so a quarter of them shimmering while
 * the rest hold still is both what a sky looks like and what keeps the sky from
 * becoming the thing you are looking at.
 *
 * And every animated element is its own composited layer on a `-z-10` backdrop
 * that a phone is already paying for. One in four of 260 is 65 animated nodes,
 * which is what this file cost when it had 64 stars and animated all of them:
 * the sky gets four times the stars for the same number of moving parts, and
 * the extra 195 are static divs that rasterise once. See the node-count budget
 * in `codebase-map/painted-world.md`.
 */
const SHIMMER_EVERY = 4;

function stars() {
  const rand = makeRng(STAR_SEED);
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    // Most stars are faint; a few are not. `mid` clusters toward the middle of
    // its range, and squaring that pushes the whole population down toward the
    // dim end while leaving a thin tail of bright ones.
    const magnitude = Math.pow(rand.mid(0, 1), 2);

    return {
      id: i,
      left: rand.float(-2, 102),
      // Kept to the upper half — stars behind the hills would be underground —
      // and denser toward the top, thinning as they approach the horizon where
      // the last of the daylight still sits.
      top: Math.pow(rand.float(0, 1), 1.35) * 48,
      r: 0.5 + magnitude * 1.5,
      opacity: 0.28 + magnitude * 0.62,
      // Slow, unrelated periods so the sky never pulses in time with itself.
      period: rand.float(3.4, 9.6),
      phase: -rand.float(0, 9),
      shimmer: i % SHIMMER_EVERY === 0,
    };
  });
}

export function NightSky() {
  const field = stars();
  const celebrating = useCelebrating();
  const { enabled: nightPreview } = useNightPreview();
  const meteors = useMeteors(celebrating || nightPreview);

  return (
    <div
      aria-hidden
      className="night-sky pointer-events-none absolute inset-0"
      data-parallax={TRAVEL.sky}
      style={{
        opacity: 0,
        transition: "opacity 1.6s ease-out",
        transform: "translate3d(0, 0, 0)",
      }}
    >
      {field.map((star) => (
        <div
          key={star.id}
          // Only the shimmering ones carry `ambient-star` — that class is what
          // the single reduced-motion rule in globals.css keys off, and a
          // static star has no animation for it to kill.
          className={`absolute rounded-full${star.shimmer ? " ambient-star" : ""}`}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            height: star.r * 2,
            width: star.r * 2,
            background: pigment.sparkle,
            opacity: star.opacity,
            ...(star.shimmer
              ? {
                  ["--star-o" as string]: star.opacity,
                  animation: `star-shimmer ${star.period}s ease-in-out infinite`,
                  animationDelay: `${star.phase}s`,
                }
              : null),
          }}
        />
      ))}

      {/* The moon, upper right. */}
      <div className="absolute right-[10vw] top-[9vh]">
        <div
          className="absolute -left-[9vh] -top-[9vh] h-[26vh] w-[26vh] rounded-full"
          style={{
            background: `radial-gradient(circle, ${veil(pigment.sparkle, 26)} 0%, ${veil(
              pigment.light,
              12,
            )} 42%, transparent 70%)`,
          }}
        />
        <div
          className="ambient-moon relative h-[8vh] w-[8vh] rounded-full"
          style={{
            background: `radial-gradient(circle at 38% 34%, ${pigment.sparkle} 0%, ${veil(
              pigment.light,
              92,
            )} 62%, ${veil(pigment.lantern, 74)} 100%)`,
            boxShadow: `0 0 6vh ${veil(pigment.sparkle, 22)}`,
            animation: "moon-breathe 96s ease-in-out infinite",
          }}
        >
          {/* Maria. Barely there — enough that it is a place, not a circle. */}
          <span
            className="absolute left-[26%] top-[30%] h-[26%] w-[30%] rounded-full"
            style={{ background: veil(pigment.lilac, 20) }}
          />
          <span
            className="absolute left-[54%] top-[56%] h-[18%] w-[22%] rounded-full"
            style={{ background: veil(pigment.lilac, 16) }}
          />
        </div>
      </div>

      {/* Falling stars. The outer element only rotates — a static transform —
          so the inner streak's `translate3d` runs along that already-rotated
          axis instead of needing its own separately-computed x/y pair. */}
      {meteors.map((meteor) => (
        <div
          key={meteor.id}
          className="absolute"
          style={{
            top: `${meteor.top}vh`,
            left: `${meteor.left}vw`,
            transform: `rotate(${meteor.angle}deg)`,
            transformOrigin: "left center",
          }}
        >
          <div
            className="ambient-meteor h-[2px] rounded-full"
            style={{
              width: `${meteor.length}vw`,
              background: `linear-gradient(to right, transparent, ${pigment.sparkle})`,
              ["--meteor-travel" as string]: `${meteor.travel}vw`,
              animation: `meteor-fall ${meteor.duration}s ease-in forwards`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
