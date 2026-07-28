import { pigment, veil } from "@/lib/ambient/palette";

/**
 * Shafts of afternoon light coming in over the right shoulder.
 *
 * Six of them, fanning from the sun down across the land. Two details do all
 * the work:
 *
 * - **They breathe out of step.** Each ray's period is a different prime-ish
 *   number of seconds — 13.7, 19.3, 23.9, 29.1, 31.7, 37.3 — so the group never
 *   pulses together and never returns to an arrangement you have seen. What it
 *   reads as is light coming through branches that are moving somewhere off
 *   the top of the frame, which is the brief's ask, and it costs six opacity
 *   animations.
 * - **They are `screen`, never `normal`.** Light adds; it cannot make anything
 *   darker. Compositing them any other way immediately turns them into grey
 *   plastic wedges laid over the picture.
 *
 * Softness comes from the gradients (transparent at both edges horizontally,
 * masked away at both ends vertically) rather than from a big `blur()`, which
 * on six full-height elements would be the most expensive thing in the scene.
 *
 * **The blend lives on each ray, not on a wrapper.** It used to sit on an
 * `inset-0` container, which made the blended region the entire viewport: a
 * `mix-blend-mode` element forces the compositor to resolve its backdrop over
 * its own bounds, so anything moving anywhere behind the scene re-blended a
 * full screen six-deep. Per-ray, the blended region is a 3–15vw strip. `screen`
 * is associative and these opacities are low, so the only thing lost is the
 * rays screening against *each other* where they overlap, which is not visible.
 */
const RAYS = [
  { left: 76, width: 9, rotate: 17, opacity: 0.3, period: 13.7, delay: -2 },
  { left: 68, width: 5, rotate: 21, opacity: 0.2, period: 19.3, delay: -7 },
  { left: 85, width: 15, rotate: 13, opacity: 0.34, period: 23.9, delay: -11 },
  { left: 59, width: 4, rotate: 27, opacity: 0.15, period: 29.1, delay: -4 },
  { left: 93, width: 8, rotate: 10, opacity: 0.26, period: 31.7, delay: -16 },
  { left: 50, width: 3, rotate: 32, opacity: 0.12, period: 37.3, delay: -9 },
] as const;

export function LightRays() {
  return (
    <div className="absolute inset-0">
      {RAYS.map((ray) => (
        <div
          key={ray.left}
          className="absolute"
          style={{
            left: `${ray.left}%`,
            top: "-34vh",
            width: `${ray.width}vw`,
            height: "158vh",
            mixBlendMode: "screen",
            transformOrigin: "top center",
            // Rotation lives on this wrapper so the animation below is free to
            // own `transform` on the child.
            transform: `rotate(${ray.rotate}deg)`,
          }}
        >
          <div
            className="ambient-ray h-full w-full"
            style={{
              background: `linear-gradient(to right, transparent 0%, ${pigment.ray} 46%, ${veil(
                pigment.ray,
                40,
              )} 62%, transparent 100%)`,
              maskImage:
                "linear-gradient(to bottom, transparent 0%, #000 16%, #000 40%, transparent 84%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, #000 16%, #000 40%, transparent 84%)",
              opacity: ray.opacity,
              ["--ray-o" as string]: ray.opacity,
              filter: "blur(5px)",
              animation: `ray-breathe ${ray.period}s ease-in-out infinite`,
              animationDelay: `${ray.delay}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
