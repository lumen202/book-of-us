/**
 * The painted world the whole book sits inside.
 *
 * A fixed, non-interactive backdrop: sky, sun, drifting clouds, layered hills,
 * grass that leans in the wind, birds crossing, seeds rising through the light.
 * Everything is inline SVG and CSS — no images, no Lottie, no external assets —
 * so it themes off the design tokens and costs nothing to load.
 *
 * Composition rules, so it stays a backdrop and not a distraction:
 *
 * - **Weight lives at the edges.** Sky at the top, hills at the bottom, plain
 *   paper through the middle third where text actually sits.
 * - **Nothing crosses the reading band quickly.** Clouds take 2–4 minutes to
 *   cross; birds are small, rare, and travel through the upper sky only.
 * - **Every colour comes from a token** via `color-mix`, so Celebration Mode
 *   turns this into golden hour for free and the seasons re-tint it.
 * - **Resting state must look finished.** Under `prefers-reduced-motion` all
 *   the animations stop dead (see globals.css), so no element may rely on an
 *   animation to reach a sensible position or opacity — the classes below set
 *   a resting transform/opacity, and the keyframes only ever depart from it.
 */

/**
 * Drift durations are long and share no small common factor, so the sky never
 * visibly loops. Negative delays start each cloud mid-journey rather than
 * having them all file in from the left edge on load.
 *
 * `left` is the resting position: with `prefers-reduced-motion` the drift
 * stops and this is where the cloud stays, so these are spread across the
 * width to compose a still scene on their own.
 */
const CLOUDS = [
  { top: "6%", left: "8%", scale: 1, duration: 190, delay: -20, opacity: 0.9 },
  { top: "14%", left: "58%", scale: 0.62, duration: 145, delay: -95, opacity: 0.7 },
  { top: "3%", left: "72%", scale: 0.78, duration: 233, delay: -160, opacity: 0.55 },
  { top: "22%", left: "34%", scale: 0.46, duration: 176, delay: -60, opacity: 0.5 },
];

const BIRDS = [
  { top: "18%", left: "22%", duration: 46, delay: -6, scale: 1 },
  { top: "26%", left: "64%", duration: 59, delay: -30, scale: 0.72 },
];

/** Deterministic, not random — the scene must be identical on every visit. */
const MOTES = [
  { left: "12%", duration: 26, delay: -4 },
  { left: "28%", duration: 34, delay: -18 },
  { left: "47%", duration: 29, delay: -11 },
  { left: "66%", duration: 38, delay: -25 },
  { left: "81%", duration: 31, delay: -2 },
  { left: "92%", duration: 36, delay: -15 },
];

function Cloud({ opacity }: { opacity: number }) {
  return (
    <svg width="220" height="90" viewBox="0 0 220 90" fill="none" style={{ opacity }}>
      {/* Overlapping ellipses rather than one path — the lumpy silhouette is
          what makes it read as painted instead of as a rounded rectangle. */}
      <g fill="color-mix(in srgb, var(--color-surface) 88%, var(--color-accent-muted))">
        <ellipse cx="70" cy="58" rx="58" ry="30" />
        <ellipse cx="120" cy="44" rx="46" ry="34" />
        <ellipse cx="160" cy="60" rx="44" ry="26" />
        <ellipse cx="98" cy="66" rx="52" ry="22" />
      </g>
      {/* A warmer underside, as if lit from below by the sun. */}
      <g fill="color-mix(in srgb, var(--color-accent-warm) 28%, transparent)">
        <ellipse cx="98" cy="76" rx="60" ry="10" />
        <ellipse cx="158" cy="72" rx="34" ry="8" />
      </g>
    </svg>
  );
}

function Flock() {
  return (
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
            animation: `bird-flap ${0.42 + index * 0.09}s ease-in-out infinite`,
          }}
        >
          <path
            d="M0 10 Q 9 0 18 9 Q 27 0 36 10"
            stroke="color-mix(in srgb, var(--color-ink) 55%, transparent)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}

export function StorybookSky() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-muted) 78%, var(--color-background)) 0%, var(--color-background) 46%, var(--color-background) 100%)",
      }}
    >
      {/* sun */}
      <div
        className="ambient-sun absolute right-[8%] top-[-6rem] h-[26rem] w-[26rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent-warm) 62%, transparent), transparent 66%)",
          opacity: 0.6,
          animation: "sun-glow 14s ease-in-out infinite",
        }}
      />

      {/* clouds */}
      {CLOUDS.map((cloud, index) => (
        <div
          key={index}
          className="ambient-cloud absolute"
          style={{
            top: cloud.top,
            left: cloud.left,
            animation: `cloud-drift ${cloud.duration}s linear infinite`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <div
            className="ambient-cloud-bob"
            style={{
              transform: `scale(${cloud.scale})`,
              animation: `cloud-bob ${18 + index * 5}s ease-in-out infinite`,
            }}
          >
            <Cloud opacity={cloud.opacity} />
          </div>
        </div>
      ))}

      {/* birds */}
      {BIRDS.map((bird, index) => (
        <div
          key={index}
          className="ambient-bird absolute"
          style={{
            top: bird.top,
            left: bird.left,
            opacity: 0.6,
            animation: `bird-fly ${bird.duration}s linear infinite`,
            animationDelay: `${bird.delay}s`,
          }}
        >
          {/* Scale lives on an inner element: `bird-fly` owns `transform` on
              the wrapper, so a transform set there would be overwritten. */}
          <div style={{ transform: `scale(${bird.scale})` }}>
            <Flock />
          </div>
        </div>
      ))}

      {/* seeds drifting up through the light */}
      {MOTES.map((mote, index) => (
        <div
          key={index}
          className="ambient-mote absolute bottom-0 h-2 w-2 rounded-full"
          style={{
            left: mote.left,
            background: "color-mix(in srgb, var(--color-accent-warm) 70%, transparent)",
            opacity: 0.45,
            animation: `float-up ${mote.duration}s linear infinite`,
            animationDelay: `${mote.delay}s`,
          }}
        />
      ))}

      {/* hills — three layers, back to front, each darker and greener */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{ height: "38vh", minHeight: "220px" }}
        fill="none"
      >
        <path
          d="M0 214 C 180 150 300 236 470 200 C 640 164 760 96 940 138 C 1120 180 1280 150 1440 116 L1440 320 L0 320 Z"
          fill="color-mix(in srgb, var(--color-accent) 26%, var(--color-background))"
        />
        <path
          d="M0 258 C 200 208 340 268 520 246 C 700 224 840 170 1030 206 C 1220 242 1330 226 1440 200 L1440 320 L0 320 Z"
          fill="color-mix(in srgb, var(--color-accent) 44%, var(--color-background))"
        />
        <path
          d="M0 292 C 160 262 320 300 500 288 C 680 276 820 244 1010 268 C 1200 292 1320 288 1440 272 L1440 320 L0 320 Z"
          fill="color-mix(in srgb, var(--color-accent) 62%, var(--color-background))"
        />
      </svg>

      {/* grass along the very bottom, leaning in the wind */}
      <div className="absolute bottom-0 left-0 flex w-full items-end justify-between px-2">
        {Array.from({ length: 26 }).map((_, index) => (
          <svg
            key={index}
            className="ambient-grass"
            width="14"
            height="26"
            viewBox="0 0 14 26"
            fill="none"
            style={{
              transformOrigin: "bottom center",
              opacity: 0.5,
              animation: `sway ${4.2 + (index % 5) * 0.6}s ease-in-out infinite`,
              animationDelay: `${-(index % 7) * 0.4}s`,
            }}
          >
            <path
              d="M7 26 C 6 18 5 10 2 2"
              stroke="color-mix(in srgb, var(--color-accent) 72%, var(--color-ink))"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M7 26 C 8 19 10 12 13 6"
              stroke="color-mix(in srgb, var(--color-accent) 60%, var(--color-ink))"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        ))}
      </div>
    </div>
  );
}
