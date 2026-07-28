import { parallax, TRAVEL } from "@/lib/ambient/depth";
import { pigment, veil } from "@/lib/ambient/palette";

/**
 * The sky — the largest and most cheerful thing in the painting.
 *
 * It is built from four stacked fields rather than one gradient, because a
 * single ramp between two colours is the flattest object a browser can make and
 * the eye reads it instantly as a background rather than as air:
 *
 * 1. a bright blue daylight ramp, zenith to horizon;
 * 2. a warm ramp over the top of it, whose opacity breathes across about seven
 *    minutes — the sky is a slightly different afternoon every time you look
 *    up, and nobody ever catches it changing;
 * 3. a band of butter-coloured light sitting on the horizon, so the land is
 *    bedded into the air instead of pasted onto it;
 * 4. a watercolour wash — fractal noise, soft-light — which is what actually
 *    breaks the ramp into blooms and tidelines the way wet pigment dries.
 *
 * Layer 4 is the one that matters most and it is the cheapest: it is a single
 * filtered rect, rasterised once and never touched again.
 *
 * Layer 3 was a grey-blue haze in an earlier version, and it is worth saying
 * why it isn't now: haze on the horizon is *distance*, and distance is the
 * emotion this scene must not have. It is light instead. The far side of this
 * garden is close enough to walk to, and it should look like somewhere warm is
 * happening over there.
 */
export function SkyLayer() {
  return (
    <div className="absolute inset-0" {...parallax(TRAVEL.sky)}>
      {/* daylight */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,
            ${pigment.skyZenith} 0%,
            ${pigment.skyMid} 40%,
            ${pigment.skyHorizon} 80%,
            ${pigment.skyHorizon} 100%)`,
        }}
      />

      {/*
       * Late afternoon, arriving and receding. `alternate` over 210s means a
       * seven-minute round trip: far slower than anyone's attention span, which
       * is the point — you can only tell it moved by having been here a while.
       * Resting opacity is mid-swing so a reduced-motion visitor gets the same
       * sky, just a fixed one.
       */}
      <div
        className="ambient-sky-warm absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,
            ${pigment.skyEveningHigh} 0%,
            ${veil(pigment.skyEveningLow, 62)} 52%,
            ${pigment.skyEveningLow} 100%)`,
          opacity: 0.38,
          animation: "sky-warm 210s ease-in-out infinite alternate",
        }}
      />

      {/* light on the horizon — warmth, not haze */}
      <div
        className="absolute inset-x-0 bottom-0 h-[58vh]"
        style={{
          background: `linear-gradient(to bottom,
            transparent 0%,
            ${veil(pigment.sunGlow, 22)} 48%,
            ${veil(pigment.light, 52)} 100%)`,
        }}
      />

      {/* the wash that stops it being a gradient */}
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        style={{ mixBlendMode: "soft-light", opacity: 0.55 }}
      >
        <rect width="100%" height="100%" filter="url(#sky-wash)" />
      </svg>
    </div>
  );
}

/**
 * The sun itself, off the top-right corner.
 *
 * Never drawn as a disc. It is three nested radial falloffs — a hot core well
 * outside the frame, a broad warm bloom, and a very wide lift over the whole
 * upper right — because what you actually see of a late sun through haze is
 * glow, not an object. The bloom is what gives everything near it that
 * overexposed warmth, and it is why the clouds on that side read as lit rather
 * than as white.
 *
 * `screen` sits on each falloff rather than on the parallax wrapper. On the
 * wrapper it made the blended region the whole viewport even though the hot
 * core only covers the top-right corner — and a `mix-blend-mode` region has to
 * be re-resolved against its backdrop whenever anything behind it moves. Same
 * result, a fraction of the fill.
 */
export function SunGlow() {
  return (
    <div className="absolute inset-0" {...parallax(TRAVEL.sky)}>
      <div
        className="ambient-sun absolute right-[-6vw] top-[-24vh] h-[72vh] w-[72vh]"
        style={{
          background: `radial-gradient(circle at center,
            ${veil(pigment.sunCore, 86)} 0%,
            ${veil(pigment.sunGlow, 52)} 28%,
            ${veil(pigment.light, 22)} 54%,
            transparent 72%)`,
          opacity: 0.72,
          mixBlendMode: "screen",
          animation: "sun-breathe 47s ease-in-out infinite",
        }}
      />
      <div
        className="ambient-sun-wide absolute right-[-24vw] top-[-40vh] h-[130vh] w-[110vw]"
        style={{
          background: `radial-gradient(ellipse at 74% 28%,
            ${veil(pigment.light, 30)} 0%,
            ${veil(pigment.sunGlow, 14)} 40%,
            transparent 70%)`,
          opacity: 0.66,
          mixBlendMode: "screen",
          animation: "sun-breathe 83s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}
