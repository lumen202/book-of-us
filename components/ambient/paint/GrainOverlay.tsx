import { pigment, veil } from "@/lib/ambient/palette";

/**
 * The paper the whole thing is painted on.
 *
 * Everything below this layer has its own brushwork, but each mass has it
 * *separately* — which is the tell that a scene was assembled rather than
 * painted. One texture pulled across all of it is what unifies the picture, the
 * same way the tooth of a real sheet is shared by every stroke on it. It is the
 * cheapest layer in the scene and probably the one doing the most work.
 *
 * Three passes:
 *
 * - **Fine grain**, multiplied. The tooth. Barely visible on its own; without
 *   it every fill in the scene looks slightly plastic.
 * - **Coarse mottle**, soft-light. Cold-press paper is not flat, and neither is
 *   the way pigment settles into it. This is what makes large calm areas —
 *   the open sky especially — stop looking like a fill.
 * - **A bloom**, screened, warm, brightest toward the sun. Not a vignette.
 *
 * That last one used to be a vignette: a soft darkening at the corners, which
 * is the standard way to draw the eye to the middle of a page. It was also
 * quietly responsible for a lot of the wrong feeling. Darkened edges read as
 * dusk, as an ending, as looking at something from outside it — and this world
 * is supposed to feel like the middle of a good afternoon. So the edges are
 * lifted rather than dropped, and the warmth pools toward the light. The text
 * still sits in the calmest part of the frame; it gets there by being where the
 * scene is quietest, not by everything else being pushed into shadow.
 *
 * Both noise fields are `stitchTiles='stitch'` so they tile seamlessly, and
 * they are tiled at unrelated sizes (300px and 720px) so the repeat of one is
 * never visible against the repeat of the other.
 */

const FINE_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")";

const PAPER_MOTTLE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='720'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.042' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='720' height='720' filter='url(%23m)'/%3E%3C/svg%3E\")";

export function GrainOverlay() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: PAPER_MOTTLE,
          backgroundSize: "720px 720px",
          mixBlendMode: "soft-light",
          opacity: 0.3,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: FINE_GRAIN,
          backgroundSize: "300px 300px",
          mixBlendMode: "multiply",
          opacity: 0.09,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 96% 84% at 74% 22%, ${veil(
            pigment.sunGlow,
            30,
          )} 0%, ${veil(pigment.light, 14)} 46%, transparent 78%)`,
          mixBlendMode: "screen",
          opacity: 0.7,
        }}
      />
    </>
  );
}
