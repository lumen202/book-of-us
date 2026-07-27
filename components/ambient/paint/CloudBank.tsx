import { CLOUDS, CLOUD_VIEW, cloudMass, type CloudSpec } from "@/lib/ambient/clouds";
import { parallax, TRAVEL } from "@/lib/ambient/depth";
import { pigment, veil } from "@/lib/ambient/palette";

/**
 * Painting order is the whole trick: shade, then body, then light. Every pass
 * goes through the cloud brush as one group, so the three tones are warped by
 * the same noise field and stay registered with each other — filter them
 * separately and the cloud comes apart into coloured fringes.
 *
 * The dissolve mask is applied *outside* the brush, so it eats the softened
 * edge rather than a hard one. Its centre is offset toward the sun, which means
 * the lit shoulder survives while the shaded side gives out into the sky —
 * exactly the asymmetry the brief asks for.
 */
function PaintedCloud({ spec }: { spec: CloudSpec }) {
  const mass = cloudMass(spec.seed);
  const mask = spec.alt ? "url(#cloud-mask-alt)" : "url(#cloud-mask)";
  // Distant clouds have less tonal range: haze eats contrast before it eats
  // brightness, so the far band loses its shadows before it loses its whites.
  const contrast = 1 - spec.band * 0.001 - (2 - spec.band) * 0.16;

  return (
    <svg
      viewBox={`0 0 ${CLOUD_VIEW.width} ${CLOUD_VIEW.height}`}
      width="100%"
      height="100%"
      fill="none"
      style={{ overflow: "visible", display: "block" }}
    >
      <g mask={mask}>
        <g filter="url(#brush-vapour)" fill={veil(pigment.cloudBody, 46 * contrast)}>
          {mass.wisps.map((d, i) => (
            <path key={`w${i}`} d={d} />
          ))}
        </g>
        <g filter="url(#brush-cloud)">
          <g fill={veil(pigment.cloudShade, 62 * contrast)}>
            {mass.shade.map((d, i) => (
              <path key={`s${i}`} d={d} />
            ))}
          </g>
          <g fill={pigment.cloudBody}>
            {mass.body.map((d, i) => (
              <path key={`b${i}`} d={d} />
            ))}
          </g>
          <g fill={veil(pigment.cloudLit, 70 + spec.band * 8)}>
            {mass.lit.map((d, i) => (
              <path key={`l${i}`} d={d} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}

/**
 * Three bands of cloud at three parallax depths.
 *
 * Speed *is* distance here — the far band takes over eight minutes to cross and
 * the near band about four, and that ratio does more to place them in space
 * than their size does. The vertical bob is layered on an inner element so it
 * composes with the drift instead of overwriting it, and its period is
 * unrelated to the drift's, so a cloud never traces the same line twice.
 */
export function CloudBank() {
  const bands = [TRAVEL.cloudsFar, (TRAVEL.cloudsFar + TRAVEL.cloudsNear) / 2, TRAVEL.cloudsNear];

  return (
    <>
      {bands.map((travel, band) => (
        <div key={band} className="absolute inset-0" style={{ transform: parallax(travel) }}>
          {CLOUDS.filter((cloud) => cloud.band === band).map((cloud) => (
            <div
              key={cloud.seed}
              className="ambient-cloud absolute left-0"
              style={{
                top: cloud.top,
                width: `${cloud.width}vw`,
                aspectRatio: `${CLOUD_VIEW.width} / ${CLOUD_VIEW.height}`,
                // The resting composition, for reduced motion — `cloud-drift`
                // overwrites this the moment animation is allowed.
                transform: `translate3d(${cloud.rest}vw, 0, 0)`,
                animation: `cloud-drift ${cloud.duration}s linear infinite`,
                animationDelay: `${cloud.delay}s`,
              }}
            >
              <div
                className="ambient-cloud-bob h-full w-full"
                style={{
                  opacity: cloud.opacity,
                  animation: `cloud-bob ${37 + cloud.seed % 23}s ease-in-out infinite`,
                  animationDelay: `${-(cloud.seed % 17)}s`,
                }}
              >
                <PaintedCloud spec={cloud} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
