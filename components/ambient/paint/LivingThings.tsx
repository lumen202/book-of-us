"use client";

import { petalPigments, pigment, veil } from "@/lib/ambient/palette";
import { makeRng } from "@/lib/ambient/rng";
import { useAmbientLife, type LifeEvent } from "@/lib/ambient/useAmbientLife";

/**
 * Everything that lives here.
 *
 * Scheduling is in `useAmbientLife` — the short version is that nothing is on a
 * loop. Each appearance is a one-shot element with its own height, speed,
 * direction and route, spawned at a random interval and removed when it leaves.
 * A viewer cannot learn the rhythm because there isn't one.
 *
 * Bodies are generated per event from its id, so a given butterfly keeps its
 * own wings for as long as it is on screen but the next one is a different
 * butterfly with different wings. Nothing in this world is ever the same object
 * twice.
 *
 * The creatures that fly properly — butterflies, bees, fireflies — use
 * `life-wander`, which eases between five waypoints instead of gliding in a
 * straight line. It is a small thing and it is the difference between a garden
 * that is inhabited and a garden with sprites moving across it.
 */

function Bird({ event }: { event: LifeEvent }) {
  const rand = makeRng(event.id * 7919 + 13);
  const count = rand.int(1, 3);

  return (
    <svg width="96" height="34" viewBox="0 0 96 34" fill="none" style={{ overflow: "visible" }}>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(${i * rand.float(20, 34)} ${rand.float(0, 18)}) scale(${1 - i * rand.float(0.08, 0.22)})`}>
          <g
            className="ambient-wing"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: `bird-flap ${0.5 + i * 0.13}s ease-in-out infinite`,
            }}
          >
            <path
              d="M0 8 Q7 0 14 7 Q21 0 28 8"
              stroke={veil(pigment.shadow, 68)}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** Four wings, upper pair larger, and a spot of a second colour on each — the
 *  detail that makes it a butterfly rather than a coloured triangle. */
function Butterfly({ event }: { event: LifeEvent }) {
  const rand = makeRng(event.id * 6301 + 29);
  const wing = petalPigments[event.hue];
  const spot = petalPigments[(event.hue + 2) % petalPigments.length];

  return (
    <svg width="28" height="24" viewBox="-14 -12 28 24" fill="none" style={{ overflow: "visible" }}>
      <g
        className="ambient-wing"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          // Fast, uneven, and never in time with the next butterfly along.
          animation: `wing-beat ${rand.float(0.24, 0.42)}s ease-in-out infinite`,
        }}
      >
        {[-1, 1].map((side) => (
          <g key={side}>
            <ellipse
              cx={side * 5}
              cy={-3}
              rx={rand.float(4.8, 6.6)}
              ry={rand.float(3.6, 5.2)}
              fill={wing}
            />
            <ellipse
              cx={side * 4}
              cy={3.2}
              rx={rand.float(3.2, 4.6)}
              ry={rand.float(2.6, 3.8)}
              fill={veil(wing, 80)}
            />
            <circle cx={side * 6} cy={-4} r={1.5} fill={veil(spot, 85)} />
          </g>
        ))}
      </g>
      <path d="M0 -5 L0 5" stroke={veil(pigment.bark, 55)} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** Round, fuzzy, banded. Bees are drawn warm rather than black-and-yellow —
 *  there is no black in this world. */
function Bee({ event }: { event: LifeEvent }) {
  const rand = makeRng(event.id * 4813 + 71);
  return (
    <svg width="18" height="14" viewBox="-9 -7 18 14" fill="none" style={{ overflow: "visible" }}>
      <g
        className="ambient-wing"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: `wing-beat ${rand.float(0.08, 0.13)}s linear infinite`,
        }}
      >
        <ellipse cx="-1" cy="-3" rx="4" ry="2.4" fill={veil(pigment.cloudBody, 72)} />
        <ellipse cx="2.5" cy="-3.2" rx="3.2" ry="2" fill={veil(pigment.cloudBody, 60)} />
      </g>
      <ellipse cx="0" cy="0" rx="4" ry="3" fill={veil(pigment.butter, 96)} />
      <path d="M-0.6 -2.8 L-0.6 2.8" stroke={veil(pigment.bark, 62)} strokeWidth="1.5" />
      <path d="M2 -2.4 L2 2.4" stroke={veil(pigment.bark, 52)} strokeWidth="1.2" />
    </svg>
  );
}

function Dragonfly({ event }: { event: LifeEvent }) {
  const rand = makeRng(event.id * 5231 + 47);
  return (
    <svg width="30" height="16" viewBox="-15 -8 30 16" fill="none" style={{ overflow: "visible" }}>
      <g
        className="ambient-wing"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: `wing-beat ${rand.float(0.1, 0.16)}s linear infinite`,
        }}
      >
        {[-1, 1].map((side) => (
          <g key={side}>
            <ellipse cx={side * 4} cy="-2.6" rx="6.2" ry="1.7" fill={veil(pigment.water, 62)} />
            <ellipse cx={side * 3} cy="1.6" rx="5" ry="1.4" fill={veil(pigment.water, 48)} />
          </g>
        ))}
      </g>
      <path d="M-9 0 L11 0" stroke={veil(pigment.lilac, 72)} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** A coffee cup with a moth's wings, steam still trailing behind it —
 *  the one fantastical creature the garden allows itself, and as common as
 *  the butterflies it shares a wing rig with (see `CADENCE`/`BURST` in
 *  `useAmbientLife.ts`), so it reads as a population, not a single easter
 *  egg. */
function FlyingCoffee({ event }: { event: LifeEvent }) {
  const rand = makeRng(event.id * 7411 + 53);

  return (
    <svg width="33" height="39" viewBox="-16.5 -22.5 33 39" fill="none" style={{ overflow: "visible" }}>
      <g
        className="ambient-wing"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: `wing-beat ${rand.float(0.3, 0.46)}s ease-in-out infinite`,
        }}
      >
        {/* `cloudShade`/`cloudBody` are built from the same tokens the sky
            itself swings on between day and night, which is fine for an
            actual cloud (it's meant to dissolve) but left these wings nearly
            invisible against both. `shadow` doesn't touch those tokens and is
            the pigment already trusted elsewhere in this file (the bird's
            wingbeat stroke) to hold contrast against the open sky at any
            hour. */}
        {[-1, 1].map((side) => (
          <ellipse key={side} cx={side * 9} cy={-1.5} rx={6.6} ry={4.8} fill={veil(pigment.shadow, 46)} />
        ))}
      </g>
      {/* Ceramic in `lantern`, not `wood` — `wood` is an ink/warm mix that
          never shifts between day and night, and against a night sky (or
          this creature's own wood-toned handle right next to it) a
          same-toned cup body read as a dark, shapeless blot rather than a
          mug. `lantern` stays a bright warm cream/gold at every hour (see
          the note in `HillRange.tsx`'s bench mug, same reasoning), so the
          cup keeps its shape regardless of what it's flying over. `wood`
          stays on the handle only, for a dark line of definition against the
          now-pale body. */}
      <path d="M-6.75 -3 Q-7.05 6.9 0 7.2 Q7.05 6.9 6.75 -3 Z" fill={veil(pigment.lantern, 86)} />
      <path d="M-6.75 -3 Q0 -6.3 6.75 -3 Q0 -0.3 -6.75 -3 Z" fill={veil(pigment.lantern, 96)} />
      <path
        d="M6.45 -1.05 Q10.8 0.45 6.45 3.6"
        stroke={veil(pigment.wood, 66)}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Same halo trick as the bench mug's steam: a dark `bark` halo behind
          a pale `lantern` core, so one of the two always contrasts with
          whatever this creature happens to be flying over — open sky, grass,
          day or night. A single flat colour (tried `light`, then `shadow`)
          kept disappearing against one backdrop or the other. */}
      <g
        className="ambient-steam"
        style={{ animation: `steam-curl ${rand.float(2.4, 3.4)}s ease-in-out infinite` }}
      >
        <path
          d="M0 -6.3 Q2.4 -11.4 0 -15.6 Q-2.4 -19.5 0.9 -22.5"
          stroke={veil(pigment.bark, 42)}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M0 -6.3 Q2.4 -11.4 0 -15.6 Q-2.4 -19.5 0.9 -22.5"
          stroke={veil(pigment.lantern, 94)}
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function Ladybug() {
  return (
    <svg width="12" height="10" viewBox="-6 -5 12 10" fill="none" style={{ overflow: "visible" }}>
      <ellipse cx="0" cy="0" rx="4" ry="3.4" fill={veil(pigment.blossom, 96)} />
      <path d="M0 -3.4 L0 3.4" stroke={veil(pigment.bark, 48)} strokeWidth="0.7" />
      <circle cx="-1.8" cy="-0.8" r="0.8" fill={veil(pigment.bark, 52)} />
      <circle cx="1.8" cy="0.9" r="0.8" fill={veil(pigment.bark, 52)} />
      <ellipse cx="-3.6" cy="-1.6" rx="1.6" ry="1.4" fill={veil(pigment.bark, 60)} />
    </svg>
  );
}

/** A soft point of light that blinks on its own rhythm. Appears rarely, low
 *  down, near the flowers — the promise the unlit lanterns were making. */
function Firefly({ event }: { event: LifeEvent }) {
  const rand = makeRng(event.id * 3767 + 89);
  return (
    <div
      className="ambient-firefly"
      style={{
        height: 10,
        width: 10,
        borderRadius: "9999px",
        background: `radial-gradient(circle, ${pigment.sparkle} 0%, ${veil(pigment.butter, 70)} 38%, transparent 70%)`,
        opacity: 0.85,
        animation: `firefly-blink ${rand.float(2.1, 4.3)}s ease-in-out infinite`,
        animationDelay: `${-rand.float(0, 4)}s`,
      }}
    />
  );
}

function Drifting({ event }: { event: LifeEvent }) {
  const rand = makeRng(event.id * 4111 + 61);
  const leaf = event.kind === "leaf";
  const colour = leaf ? pigment.grassLit : petalPigments[event.hue];
  const w = rand.float(5, 9) * (leaf ? 1.7 : 1);
  const h = rand.float(4, 7);

  return (
    <svg
      width={w * 2.4}
      height={h * 2.4}
      viewBox={`${-w * 1.2} ${-h * 1.2} ${w * 2.4} ${h * 2.4}`}
      fill="none"
      style={{ overflow: "visible" }}
    >
      {leaf ? (
        <>
          <path d={`M${-w} 0 Q0 ${-h} ${w} 0 Q0 ${h} ${-w} 0 Z`} fill={veil(colour, 88)} />
          <path d={`M${-w} 0 L${w} 0`} stroke={veil(pigment.bark, 36)} strokeWidth="0.7" />
        </>
      ) : (
        // Blossom petals are not ellipses — one end is narrower than the other.
        <path
          d={`M${-w} 0 Q${-w * 0.3} ${-h} ${w} ${-h * 0.2} Q${w * 0.2} ${h} ${-w} 0 Z`}
          fill={veil(colour, 92)}
        />
      )}
    </svg>
  );
}

const SHAPES = {
  bird: Bird,
  butterfly: Butterfly,
  bee: Bee,
  dragonfly: Dragonfly,
  ladybug: Ladybug,
  firefly: Firefly,
  petal: Drifting,
  leaf: Drifting,
  coffee: FlyingCoffee,
} as const;

export function LivingThings() {
  const events = useAmbientLife();

  return (
    <div className="absolute inset-0">
      {events.map((event) => {
        const Shape = SHAPES[event.kind];
        const flutters = event.kind === "petal" || event.kind === "leaf";

        // Wanderers get their five waypoints as custom properties; gliders get
        // a start and an end. One keyframe each, shared by everything.
        const route: Record<string, string | number> = {};
        if (event.motion === "wander") {
          event.route.forEach((point, i) => {
            route[`--w${i}x`] = `${point.x}vw`;
            route[`--w${i}y`] = `${point.y}vh`;
          });
        } else {
          route["--life-x0"] = event.direction === 1 ? "-16vw" : "114vw";
          route["--life-x1"] = event.direction === 1 ? "114vw" : "-16vw";
          route["--life-y1"] = `${event.rise}vh`;
          route["--life-r1"] = `${event.spin}deg`;
        }

        return (
          <div
            key={event.id}
            className="ambient-life absolute left-0"
            style={{
              top: `${event.top}vh`,
              ...route,
              ["--life-o" as string]: event.opacity,
              opacity: 0,
              // `forwards` and a single iteration: this element exists for
              // exactly one crossing and is then unmounted.
              animation:
                event.motion === "wander"
                  ? `life-wander ${event.duration}s ease-in-out forwards`
                  : `life-cross ${event.duration}s linear forwards`,
            }}
          >
            <div
              style={{
                transform: `scale(${event.scale}) scaleX(${event.direction})`,
                transformOrigin: "center",
              }}
            >
              {flutters ? (
                <div
                  className="ambient-flutter"
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation: `petal-flutter ${1.6 + (event.id % 7) * 0.3}s ease-in-out infinite`,
                  }}
                >
                  <Shape event={event} />
                </div>
              ) : (
                <Shape event={event} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The life that is always here: a couple of high flocks and two butterflies
 * resting on the flowers.
 *
 * `useAmbientLife` starts no timers under `prefers-reduced-motion`, so without
 * these the garden of a reduced-motion visit would be empty of everything
 * living. These are static, deterministic and server-rendered — they hold the
 * composition, and the scheduled creatures pass through in front of them. The
 * resting butterflies matter more than the birds do: a meadow with a butterfly
 * sitting in it is inhabited even when nothing is moving.
 */
export function DistantFlock() {
  return (
    <div className="absolute inset-0">
      {[
        { top: "12%", left: "33%", scale: 0.5, opacity: 0.3, seed: 5 },
        { top: "19%", left: "69%", scale: 0.34, opacity: 0.22, seed: 9 },
      ].map((flock) => {
        const rand = makeRng(flock.seed * 977);
        return (
          <div
            key={flock.seed}
            className="absolute"
            style={{
              top: flock.top,
              left: flock.left,
              opacity: flock.opacity,
              transform: `scale(${flock.scale})`,
            }}
          >
            <svg width="120" height="46" viewBox="0 0 120 46" fill="none">
              {Array.from({ length: 4 }, (_, i) => (
                <g
                  key={i}
                  transform={`translate(${i * rand.float(19, 30)} ${rand.float(0, 26)}) scale(${1 - i * 0.12})`}
                >
                  <g
                    className="ambient-wing"
                    style={{
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      animation: `bird-flap ${0.44 + i * 0.11}s ease-in-out infinite`,
                    }}
                  >
                    <path
                      d="M0 7 Q6 0 12 6 Q18 0 24 7"
                      stroke={veil(pigment.shadow, 62)}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              ))}
            </svg>
          </div>
        );
      })}

      {[
        { top: "74%", left: "17%", scale: 0.9, hue: 0, period: 3.1 },
        { top: "81%", left: "63%", scale: 0.72, hue: 3, period: 4.3 },
      ].map((rest, i) => (
        <div
          key={i}
          className="absolute"
          style={{ top: rest.top, left: rest.left, transform: `scale(${rest.scale})` }}
        >
          <svg width="24" height="20" viewBox="-12 -10 24 20" fill="none">
            <g
              className="ambient-wing"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                // Slow: wings opening and closing while it sits, not flying.
                animation: `wing-rest ${rest.period}s ease-in-out infinite`,
              }}
            >
              {[-1, 1].map((side) => (
                <g key={side}>
                  <ellipse cx={side * 4.5} cy="-2.5" rx="5" ry="4" fill={petalPigments[rest.hue]} />
                  <ellipse cx={side * 3.5} cy="3" rx="3.4" ry="2.8" fill={veil(petalPigments[rest.hue], 78)} />
                </g>
              ))}
            </g>
            <path d="M0 -4 L0 4" stroke={veil(pigment.bark, 55)} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}
