import { TRAVEL } from "@/lib/ambient/depth";
import { pigment, veil } from "@/lib/ambient/palette";
import { makeRng } from "@/lib/ambient/rng";

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
 */

const STAR_SEED = 50505;

/** Enough to read as a sky, few enough to stay a handful of nodes. */
const STAR_COUNT = 64;

function stars() {
  const rand = makeRng(STAR_SEED);
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    left: rand.float(0, 100),
    // Kept to the upper half: stars behind the hills would be under the ground.
    top: rand.float(0, 46),
    r: rand.float(0.7, 1.9),
    opacity: rand.float(0.35, 0.95),
    // Slow, unrelated periods so the sky never pulses in time with itself.
    period: rand.float(3.4, 9.6),
    phase: -rand.float(0, 9),
  }));
}

export function NightSky() {
  const field = stars();

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
          className="ambient-star absolute rounded-full"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            height: star.r * 2,
            width: star.r * 2,
            background: pigment.sparkle,
            opacity: star.opacity,
            ["--star-o" as string]: star.opacity,
            animation: `star-shimmer ${star.period}s ease-in-out infinite`,
            animationDelay: `${star.phase}s`,
          }}
        />
      ))}

      {/* The moon, opposite the sun's usual corner so the composition doesn't
          simply swap one bright spot for another in the same place. */}
      <div className="absolute left-[14vw] top-[9vh]">
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
    </div>
  );
}
