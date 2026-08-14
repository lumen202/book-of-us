import { DEFAULT_COMPOSITION, type Composition } from "@/lib/ambient/composition";
import { parallax, TRAVEL } from "@/lib/ambient/depth";
import { meadow, MEADOW_STAGE, motes, petals } from "@/lib/ambient/flora";
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
/**
 * The literal `tuft-sway-N` keyframe nearest a generated amplitude — the
 * amplitudes are quantised so the keyframes can hold literal values, which is
 * what lets Chromium run the wave on the compositor. Deterministic from the
 * seeded amplitude, so server and client agree.
 */
function swayKeyframe(sway: number): string {
  const variant = Math.min(4, Math.max(1, Math.round(sway)));
  return `tuft-sway-${variant}`;
}

const ROW_TONE = [
  // far row — bright and pale, continuous with the last rise
  { blade: mix(pigment.grassPale, 78, pigment.grass), lit: mix(pigment.grassLit, 54, pigment.grassPale) },
  { blade: pigment.grass, lit: mix(pigment.grassLit, 70, pigment.grass) },
  // near row — the deepest green in the picture, and still fresh
  { blade: mix(pigment.grass, 62, pigment.grassDeep), lit: mix(pigment.grassLit, 62, pigment.grass) },
] as const;

export function MeadowLayer({
  composition = DEFAULT_COMPOSITION,
}: {
  composition?: Composition;
}) {
  const stage = MEADOW_STAGE[composition];
  const field = meadow(composition);

  return (
    <div
      className="absolute left-0 w-full overflow-hidden"
      data-parallax={TRAVEL.meadow}
      style={{
        bottom: -56,
        height: "calc(27vh + 56px)",
        minHeight: 220,
        transform: "translate3d(0, 0, 0)",
      }}
    >
      {/*
       * The landscape composition still carries its old narrow-screen
       * mitigation, and it is worth knowing why it is here and why it is no
       * longer the answer.
       *
       * The full 1440-unit field squeezed into ~390px compresses every tuft to
       * a quarter of its width while leaving its height alone — spindly, and
       * the one place `preserveAspectRatio="none"` really does bite. So the
       * landscape field is drawn wider than its container and pulled left, and
       * the container clips it: a *slice* of the same meadow at a sane scale
       * rather than the whole thing squashed.
       *
       * That fixes how wide a blade is and does nothing about how tall — the
       * grass was still 1.56x too high — and it shows the middle of a field
       * whose `edgeBias` arch is out at ±720, so the foreground stopped
       * wrapping around the reading column on exactly the screens where the
       * column is widest. The portrait composition regenerates the field at the
       * phone's own width instead, and needs no slice: it is drawn full width,
       * at its own aspect, with the arch back at the screen edges.
       */}
      <svg
        className={
          composition === "portrait"
            ? "absolute inset-0 h-full w-full"
            : "absolute inset-y-0 -left-[60%] w-[220%] sm:left-0 sm:w-full"
        }
        viewBox={`0 0 ${stage.view.width} ${stage.view.height}`}
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
              <g
                key={i}
                // Far row, and every third one of it, are what the
                // `(pointer: coarse)` meadow-thinning rule in globals.css takes
                // out — the class goes on the outer group so hiding one removes
                // its blades from the paint too, not just its animation. The
                // mid row keeps its paint but never sways (`meadow-mid`,
                // frozen unconditionally in globals.css — the desktop-can-
                // afford-it assumption measured false, see the rule): freezing
                // a whole distance band, rather than every other tuft across
                // the field, is what shrinks the repaint area — staggered
                // phases mean interleaved frozen tufts leave every raster
                // tile damaged anyway. The wind survives in the near row,
                // whose lean is three times the far row's and carries the
                // depth cue on its own.
                className={
                  row === 0
                    ? i % 3 === 2
                      ? "meadow-far meadow-thin"
                      : "meadow-far"
                    : row === 1
                      ? "meadow-mid"
                      : undefined
                }
                transform={`translate(${tuft.x} ${tuft.y}) scale(${tuft.scale})`}
              >
                <g
                  className="ambient-tuft"
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "bottom center",
                    // Nearest literal keyframe variant, not `--sway` — a
                    // var() in keyframes forces the animation onto the main
                    // thread per frame. See the tuft-sway comment in
                    // globals.css.
                    animation: `${swayKeyframe(tuft.sway)} ${tuft.period}s ease-in-out infinite`,
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
          <g
            key={i}
            // Far-row flowers are two nodes each and read as dots of colour;
            // they keep their colour on touch devices but stop swaying. Mid
            // row flowers hold still everywhere, with the grass they stand in.
            className={
              flower.row === 0 ? "meadow-far" : flower.row === 1 ? "meadow-mid" : undefined
            }
            transform={`translate(${flower.x} ${flower.y}) scale(${flower.scale})`}
          >
            <g
              className="ambient-tuft"
              style={{
                transformBox: "fill-box",
                transformOrigin: "bottom center",
                animation: `${swayKeyframe(flower.sway)} ${flower.period}s ease-in-out infinite`,
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
      {/* `screen` here sits directly over the one part of the scene that never
          stops moving, so it is re-resolved against the swaying grass every
          frame whether or not the sparkles themselves are animating — the
          `(pointer: coarse)` rule in globals.css unblends it. */}
      <g className="meadow-sparkles" fill={pigment.sparkle} style={{ mixBlendMode: "screen" }}>
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
 * Petals coming down off the cherry.
 *
 * The one layer in the scene that crosses the whole frame, foreground
 * included, and the reason it earns that: the garden is a still painting with
 * a few things stirring in it, and until now everything that moved was either
 * far away (clouds, birds) or ankle-height (grass, pollen). Falling blossom is
 * the thing that makes a static picture read as *a moment* — weather passing
 * through, rather than scenery.
 *
 * It stays within the composition rules that govern everything else here:
 *
 * - **Nothing crosses the reading band quickly.** These take fourteen to
 *   twenty-seven seconds to cross the whole viewport, which is slower than a
 *   cloud looks and far below the speed at which motion pulls the eye off text.
 * - **Nothing loops visibly.** Each petal is a single pass with its own
 *   duration and a negative delay, so they never arrive together and no petal
 *   ever retraces another's path. See `petal-fall` in globals.css.
 * - **The resting state must look finished.** Under `prefers-reduced-motion`
 *   the `ambient-` class kills the animation and each petal keeps the resting
 *   transform and opacity declared inline — so they sit in the air as blossom
 *   caught mid-fall, which is a painting, not a bug.
 *
 * Shape rather than a dot: an ellipse with one corner rounded off through
 * asymmetric `border-radius`, which at this size is all it takes. The tones
 * come from the same three cherry pigments the canopy is painted in, so the
 * petals in the air and the blossom they fell from are the same flower.
 */
const PETAL_TONE = [pigment.cherryLit, pigment.petal, pigment.cherryMid] as const;

export function Petals() {
  return (
    <div className="absolute inset-0 overflow-hidden" {...parallax(TRAVEL.motes)}>
      {petals().map((petal) => (
        <div
          key={petal.id}
          // `petal-thin` marks every third sharp petal for the touch-device
          // thinning rule in globals.css, the same trade as `meadow-thin`:
          // each petal is its own animated compositor layer, and half as many
          // of them reads as a lighter snowfall, not a missing one.
          className={`ambient-petal absolute${petal.blur ? " petal-soft" : ""}${
            !petal.blur && petal.id % 3 === 2 ? " petal-thin" : ""
          }`}
          style={{
            left: `${petal.left}%`,
            top: 0,
            height: petal.size,
            width: petal.size * 1.35,
            background: PETAL_TONE[petal.tone],
            // One end rounded, the other drawn to a soft point.
            borderRadius: "60% 60% 60% 12%",
            filter: petal.blur ? `blur(${petal.blur}px)` : undefined,
            opacity: petal.opacity,
            // A literal keyframe variant by id, not `--petal-*` custom
            // properties — var() in keyframes would pin every petal to
            // per-frame main-thread style recalc. See petal-fall in
            // globals.css.
            animation: `petal-fall-${(petal.id % 6) + 1} ${petal.duration}s linear infinite`,
            animationDelay: `${petal.delay}s`,
          }}
        />
      ))}
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
    <div className="absolute inset-0" {...parallax(TRAVEL.motes)}>
      {motes().map((mote) => (
        <div
          key={mote.id}
          // The blurred ones are the close, out-of-focus motes. Each is its own
          // composited layer with a blur pass on it, which is cheap on a
          // desktop GPU and not on a phone — `(pointer: coarse)` in globals.css
          // drops them and keeps the sharp ones, so the light still has
          // something floating in it.
          className={`ambient-mote absolute rounded-full${mote.blur ? " mote-soft" : ""}`}
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
            // Literal variant by id — same var()-in-keyframes trap as the
            // petals; see mote-rise in globals.css.
            animation: `mote-rise-${(mote.id % 4) + 1} ${mote.duration}s linear infinite`,
            animationDelay: `${mote.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
