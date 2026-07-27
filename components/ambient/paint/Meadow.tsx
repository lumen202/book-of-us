import { parallax, TRAVEL } from "@/lib/ambient/depth";
import { meadow, MEADOW_VIEW, motes } from "@/lib/ambient/flora";
import { mix, pigment, species, veil } from "@/lib/ambient/palette";

/**
 * The flower meadow you are standing in.
 *
 * Three rows at three distances, and everything about a row scales with its
 * distance: blade height, tuft size, tone, flower detail, and — the important
 * one — how far it moves in the wind. The near row leans three times as far as
 * the far row, and the *difference in movement* is a stronger depth cue than
 * the difference in size. Same reason a train window makes the near fence look
 * fast.
 *
 * The wind is a wave, not a wobble. Each tuft's animation delay comes from its
 * x position, so a gust crosses the meadow left to right in about four seconds
 * and the grass leans in sequence rather than in unison. Every tuft and every
 * flower then has its own period on top of that, so the wave never sharpens
 * into a marching band and no two flowers ever sway together.
 *
 * The meadow also grows taller toward the left and right edges (`edgeBias` in
 * `flora.ts`). That is the composition wrapping itself around the content: the
 * foreground arches up at the sides the same way the boughs arch over the top,
 * and the reader ends up sitting *in* the field rather than looking at it,
 * while the middle stays low and clear for the text.
 *
 * **Why the tufts are unfiltered:** an SVG filter over a group whose children
 * animate has to re-run every frame. The brush texture goes on the static
 * masses — undergrowth, stones — where it is free, and the blades get their
 * irregularity from their generated geometry (every one a different height,
 * lean and curl) plus the paper grain over the whole scene.
 */

/**
 * Both tones per row are fully opaque. A blade lit with a *translucent* colour
 * lets the sky through at the edges of the meadow and the whole foreground goes
 * chalky — the lit tone is a lighter green, not a thinner one.
 */
const ROW_TONE = [
  // far row — bright and pale, continuous with the last rise
  { blade: mix(pigment.grassPale, 78, pigment.grass), lit: mix(pigment.grassLit, 54, pigment.grassPale) },
  { blade: pigment.grass, lit: mix(pigment.grassLit, 70, pigment.grass) },
  // near row — the deepest green in the picture, and still fresh
  { blade: mix(pigment.grass, 62, pigment.grassDeep), lit: mix(pigment.grassLit, 62, pigment.grass) },
] as const;

export function MeadowLayer() {
  const field = meadow();

  return (
    <div
      className="absolute left-0 w-full overflow-hidden"
      style={{
        bottom: -56,
        height: "calc(27vh + 56px)",
        minHeight: 220,
        transform: parallax(TRAVEL.meadow),
      }}
    >
      {/*
       * On a phone the full 1440-unit field squeezed into ~390px would compress
       * every tuft to a quarter of its width while leaving its height alone —
       * spindly, wrong, and the one place `preserveAspectRatio="none"` really
       * does bite. So narrow viewports show a *slice* of the same meadow at a
       * sane scale instead: the SVG is drawn wider than its container and
       * pulled left, and the container clips it. Same generated field, same
       * flowers, just standing closer to it.
       */}
      <svg
        className="absolute inset-y-0 -left-[60%] w-[220%] sm:left-0 sm:w-full"
        viewBox={`0 0 ${MEADOW_VIEW.width} ${MEADOW_VIEW.height}`}
        preserveAspectRatio="none"
        fill="none"
      >
      {/* The meadow's own depth. Soft, shapeless, and the thing that gives the
          blades something to stand against instead of floating on the hill. */}
      <g filter="url(#brush-shade)" fill={veil(pigment.shadow, 22)}>
        {field.undergrowth.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Stones. Small, few, and half of them catching the light. */}
      <g className="brush-meadow" filter="url(#brush-meadow)">
        {field.pebbles.map((pebble, i) => (
          <path
            key={i}
            d={pebble.d}
            fill={pebble.tone ? veil(pigment.stone, 62) : veil(pigment.shadow, 26)}
          />
        ))}
      </g>

      {[0, 1, 2].map((row) => (
        <g key={row}>
          {field.tufts
            .filter((tuft) => tuft.row === row)
            .map((tuft, i) => (
              <g key={i} transform={`translate(${tuft.x} ${tuft.y}) scale(${tuft.scale})`}>
                <g
                  className="ambient-tuft"
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "bottom center",
                    ["--sway" as string]: `${tuft.sway}deg`,
                    animation: `tuft-sway ${tuft.period}s ease-in-out infinite`,
                    animationDelay: `${tuft.phase}s`,
                  }}
                >
                  {tuft.blades.map((blade, b) => (
                    <g key={b}>
                      <path
                        d={blade.d}
                        // Every third blade takes the light. Not every one —
                        // uniformly lit grass reads as plastic.
                        fill={b % 3 === 1 ? ROW_TONE[row].lit : ROW_TONE[row].blade}
                      />
                      {blade.seed && (
                        <ellipse
                          cx={blade.tipX}
                          cy={blade.tipY}
                          rx={1.8}
                          ry={3.4}
                          fill={veil(pigment.grassLit, 78)}
                          transform={`rotate(${blade.tipX * 0.6} ${blade.tipX} ${blade.tipY})`}
                        />
                      )}
                    </g>
                  ))}
                </g>
              </g>
            ))}
        </g>
      ))}

      {/*
       * The flowers — daisies, buttercups, pink wildflowers, lavender, clover
       * and tiny white blossom, growing in drifts of one species rather than
       * scattered evenly. Each one sways on its own period, so a breeze moves
       * through the field rather than over it.
       */}
      {field.flowers.map((flower, i) => {
        const tone = species[flower.species];
        return (
          <g key={i} transform={`translate(${flower.x} ${flower.y}) scale(${flower.scale})`}>
            <g
              className="ambient-tuft"
              style={{
                transformBox: "fill-box",
                transformOrigin: "bottom center",
                ["--sway" as string]: `${flower.sway}deg`,
                animation: `tuft-sway ${flower.period}s ease-in-out infinite`,
                animationDelay: `${flower.phase}s`,
              }}
            >
              <path
                d={flower.stem}
                stroke={veil(pigment.grassDeep, 62)}
                strokeWidth={0.9}
                fill="none"
                strokeLinecap="round"
              />
              {flower.parts.map((part, p) => (
                <path key={p} d={part.d} fill={part.heart ? tone.heart : tone.petal} />
              ))}
            </g>
          </g>
        );
      })}

      {/*
       * Points of light on the grass: dew, or the sun catching a leaf edge.
       * They twinkle on unrelated periods so the field glitters faintly without
       * ever pulsing together — the small, almost-imperceptible thing that
       * makes a still image feel like a place with air in it.
       */}
      <g fill={pigment.sparkle} style={{ mixBlendMode: "screen" }}>
        {field.sparkles.map((sparkle, i) => (
          <circle
            key={i}
            className="ambient-sparkle"
            cx={sparkle.x}
            cy={sparkle.y}
            r={sparkle.r}
            style={{
              opacity: 0.5,
              animation: `sparkle-twinkle ${sparkle.period}s ease-in-out infinite`,
              animationDelay: `${sparkle.phase}s`,
            }}
          />
        ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * Pollen, dandelion seed and blossom hanging in the light.
 *
 * Deliberately mixed in focus: the big ones are blurred, which the eye reads as
 * "very close to me", and which buys a few more metres of depth in front of the
 * meadow for almost nothing. They rise rather than fall, slowly, and each one
 * drifts sideways by its own amount so the column never reads as a column.
 */
export function Pollen() {
  return (
    <div className="absolute inset-0" style={{ transform: parallax(TRAVEL.motes) }}>
      {motes().map((mote) => (
        <div
          key={mote.id}
          className="ambient-mote absolute rounded-full"
          style={{
            left: `${mote.left}%`,
            bottom: "-4vh",
            height: mote.size,
            width: mote.size,
            background: `radial-gradient(circle, ${veil(pigment.sparkle, 94)}, ${veil(
              pigment.sunGlow,
              34,
            )} 70%, transparent)`,
            filter: mote.blur ? `blur(${mote.blur}px)` : undefined,
            opacity: mote.opacity,
            ["--mote-o" as string]: mote.opacity,
            ["--mote-drift" as string]: `${mote.drift}px`,
            animation: `mote-rise ${mote.duration}s linear infinite`,
            animationDelay: `${mote.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
