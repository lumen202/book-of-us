import { DEFAULT_COMPOSITION, type Composition } from "@/lib/ambient/composition";
import { parallax, TRAVEL } from "@/lib/ambient/depth";
import { paintedTree, TREE_VIEW } from "@/lib/ambient/flora";
import { mix, pigment, veil } from "@/lib/ambient/palette";
import { picnic, swing } from "@/lib/ambient/props";

/**
 * Where the tree stands, per composition.
 *
 * The tree is drawn into an aspect-locked box, so it was never *distorted* by
 * the tall-frame problem — it was mis-*placed* by it. The landscape numbers put
 * it far enough left that a 430px-wide frame cut the swing off the side of the
 * screen, and at 52vw it was small enough that its crown sat below the horizon
 * instead of breaking it.
 *
 * The portrait staging keeps it in the **left half of the frame**, which is the
 * rule that matters and the one a tall frame makes easy to lose. A first pass
 * at 88vw put the trunk near the middle with the canopy spread across the whole
 * width; it was a fine tree and the wrong composition — it sat directly behind
 * the reading column and became the subject, exactly what "the text has the
 * middle" exists to prevent. Foliage at the edges, calm in the centre.
 *
 * The three numbers are tied together and cannot be tuned independently:
 *
 * - `w-[65vw]` — the width is *set by the swing*, not chosen. The swing hangs
 *   at 15% of the tree's own box and the trunk stands at 46%, so the two are
 *   only 31% of the box apart. Keeping the swing on screen while keeping the
 *   trunk in the left quarter leaves no room above about 67vw; past that, every
 *   offset either crops the swing or pushes the trunk into the middle.
 * - `left-[-5vw]` — puts the trunk about a quarter of the way in and lands the
 *   canopy across roughly 11%–44% of the frame. That is the other half of the
 *   brief: the canopy has to stop before the creek, because in the wide frame
 *   the bridge stands well clear of the tree in open ground, and a tree grown
 *   to fill a narrow frame swallows it. See `HILL_STAGE.portrait.props`, which
 *   moves the fold right to hold up its end of the same relationship.
 * - `bottom-[32vh]` — stands it on the near slope with its crown breaking the
 *   horizon rather than sitting under it, as it does in the wide frame.
 *
 * Whole class strings, never interpolated fragments: the Tailwind scanner only
 * generates utilities it can see written out.
 */
const TREE_STAGE: Record<Composition, string> = {
  landscape:
    "bottom-[16vh] left-[-6vw] w-[52vw] sm:bottom-[18vh] sm:left-[1vw] sm:w-[34vw] lg:w-[27vw]",
  portrait: "bottom-[32vh] left-[-5vw] w-[65vw]",
};

/**
 * The tree with the swing on it.
 *
 * If the garden has a centre, this is it — not because it is in the middle of
 * the frame (it deliberately is not; it stands off to the left so the text has
 * the middle) but because it is the thing every other object implies. The path
 * goes past it. The bench looks toward it. It is where you would arrange to
 * meet someone.
 *
 * A broad rounded dome on a warm curved trunk, painted in the same three tonal
 * passes as everything else: shade, body, sunlit leaves, with blossom riding on
 * the outside of the canopy where the light is. One low branch reaches further
 * out than the others, into open space, and the swing hangs from that.
 *
 * The swing is the only object in this world that is unmistakably about *two*
 * people — one sits, one pushes. Its ropes hang slightly unevenly and its seat
 * is not level, because a swing that has hung outside for years never is, and
 * that crookedness is the whole difference between "a swing" and "a swing that
 * has been used a thousand times". It drifts a degree or two, as though
 * somebody has just got up from it.
 *
 * This is a separate layer rather than part of the hill SVG because the hills
 * are stretched with `preserveAspectRatio="none"` — a tree in there would be
 * squashed into a topiary at wide viewports.
 */
export function BigTree({ composition = DEFAULT_COMPOSITION }: { composition?: Composition }) {
  const tree = paintedTree(6247);
  const ropes = swing(tree.swingAnchor, { drop: 132, width: 44, seed: 1553 });
  // The hanami blanket, spread to the front-right of the trunk where the
  // petals come down — in the tree's own SVG so it bakes into the tree band
  // and lands under the falling blossom at zero runtime cost.
  const spread = picnic(
    { x: TREE_VIEW.width * 0.74, y: TREE_VIEW.height - 14 },
    { width: TREE_VIEW.width * 0.34, seed: 2741 },
  );

  return (
    <div className="absolute inset-0" {...parallax(TRAVEL.tree)}>
      <div
        className={`absolute ${TREE_STAGE[composition]}`}
        style={{ aspectRatio: `${TREE_VIEW.width} / ${TREE_VIEW.height}` }}
      >
        <svg
          viewBox={`0 0 ${TREE_VIEW.width} ${TREE_VIEW.height}`}
          width="100%"
          height="100%"
          fill="none"
          style={{ overflow: "visible", display: "block" }}
        >
          {/*
            The pool of shade it throws on the grass.

            Two passes, and the second is the one that matters. A single soft
            pool at low alpha is ambient occlusion: it darkens a region but never
            says where the tree *meets the ground*, which is why the tree used to
            float above the meadow. A real shadow is densest at the point of
            contact and loses density with distance, and reproducing just that
            one gradient is most of what makes an object sit in a scene rather
            than hover over it.
          */}
          <g filter="url(#brush-shade)">
            <path d={tree.groundShade} fill={veil(pigment.shadowDeep, 44)} />
            <path d={tree.groundShade} fill={veil(pigment.contact, 34)} />
          </g>

          {/*
            The picnic — blanket, basket, two cups. Under the fallen petals
            (drawn next), so blossom lies on the cloth as well as the grass:
            the blanket has been out long enough to catch some, which is the
            whole story it is telling. Kept low-contrast like every prop; the
            check is two stripes each way, not gingham.
          */}
          <g filter="url(#brush-shade)">
            <path d={spread.shade} fill={veil(pigment.contact, 26)} />
          </g>
          <g filter="url(#brush-prop)">
            <path d={spread.blanket} fill={veil(pigment.lantern, 88)} />
            {spread.stripes.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke={veil(i % 2 === 0 ? pigment.blossom : pigment.butter, 38)}
                strokeWidth="2.2"
                fill="none"
              />
            ))}
            <path d={spread.fold} fill={veil(pigment.light, 84)} />
            <path d={spread.basket} fill={pigment.wood} />
            <path d={spread.basket} fill={veil(pigment.barkLit, 30)} transform="translate(1 -1)" />
            <path
              d={spread.basketRim}
              stroke={veil(pigment.barkLit, 62)}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d={spread.handle}
              stroke={veil(pigment.wood, 78)}
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {spread.cups.map((cup, i) => (
              <g key={i}>
                <ellipse cx={cup.cx} cy={cup.cy} rx={cup.r} ry={cup.r * 0.72} fill={pigment.sparkle} />
                <ellipse
                  cx={cup.cx}
                  cy={cup.cy - cup.r * 0.14}
                  rx={cup.r * 0.62}
                  ry={cup.r * 0.4}
                  fill={veil(pigment.shadow, 34)}
                />
              </g>
            ))}
          </g>

          {/*
            The drift of petals on the grass, lying on top of the shade. Half
            the reason the falling petals read as real is that the ground
            answers where they end up — a cherry dropping blossom all afternoon
            stands in the evidence of it.
          */}
          <g filter="url(#brush-prop)">
            {tree.fallenPetals.map((petal, i) => (
              <path
                key={i}
                d={petal.d}
                fill={veil(
                  [pigment.cherryLit, pigment.petal, pigment.cherryMid][petal.tone],
                  petal.tone === 2 ? 62 : 78,
                )}
              />
            ))}
          </g>

          {/*
            Trunk and limbs.

            The sun sits off the top-right (see `SunGlow`), so the shaded side of
            the trunk is on the left and the lit edge on the right. Three offset
            copies — shade, body, lit — is what turns a flat silhouette into
            something round; it is the same light/mid/dark banding the canopy
            uses below, at the scale of a single form.
          */}
          {/*
            Cherry wood is nearly black — and that darkness is load-bearing,
            not a palette taste: the blossom only reads as luminous against
            limbs markedly darker than anything in the canopy. The mid-brown
            the old leafy tree wore let the branches dissolve into the pink.
          */}
          <g filter="url(#brush-prop)">
            <path d={tree.trunk} fill={pigment.cherryBark} />
            <path d={tree.trunk} fill={pigment.barkShade} transform="translate(2 0)" />
            <path d={tree.trunk} fill={veil(pigment.barkLit, 38)} transform="translate(5 0)" />
            <g fill={pigment.cherryBark}>
              {tree.limbs.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </g>

          {/* the swing, hanging where it always hangs */}
          <g
            className="ambient-swing"
            style={{
              transformBox: "fill-box",
              transformOrigin: "top center",
              animation: "swing-rest 17s ease-in-out infinite",
            }}
          >
            <g filter="url(#brush-prop)">
              {ropes.ropes.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke={veil(pigment.wood, 62)}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
              <path d={ropes.seat} fill={pigment.wood} />
              <path d={ropes.seat} fill={veil(pigment.barkLit, 46)} transform="translate(0 -1)" />
            </g>
          </g>

          {/*
            Canopy: shade, structure showing through, body, then the light.

            The three bands were always here; what was wrong was their *values*.
            This bottom band used to be `grassDeep` nudged toward lilac, which is
            a mid-tone — so the canopy's "shadow", "mid" and "lit" layers all
            landed within a few percent of each other and the whole mass read as
            one flat sticker. It is now genuinely the dark end of the picture.
            See the value-range note in `lib/ambient/palette.ts`.
          */}
          <g className="brush-leaf" filter="url(#brush-leaf)" fill={pigment.canopyShade}>
            {tree.shadow.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g
            filter="url(#brush-prop)"
            stroke={veil(pigment.cherryBark, 74)}
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            {tree.twigs.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g className="brush-leaf" filter="url(#brush-leaf)" fill={pigment.canopyMid}>
            {tree.mid.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g className="brush-leaf" filter="url(#brush-leaf)" fill={mix(pigment.grassLit, 86, pigment.butter)}>
            {tree.lit.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/*
            The blossom — which on a cherry is most of the canopy, not a
            garnish. Three passes in the same order and the same light logic as
            the leaves under them, so the mass keeps its volume: dusty and cool
            underneath, pink through the body, near-white where the afternoon
            lands. Kept in step with `FramingBoughs`, which is the same tree
            seen from underneath.
          */}
          <g className="brush-leaf" filter="url(#brush-leaf)">
            <g fill={pigment.cherryShade}>
              {tree.blossomShade.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g fill={pigment.cherryMid}>
              {tree.blossomMid.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g fill={pigment.cherryLit}>
              {tree.blossomLit.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            {/* the white, touched on last — see pigment.cherryHigh */}
            <g fill={pigment.cherryHigh}>
              {tree.blossomHigh.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </g>

          {/* sunlight through the leaves */}
          <g fill={veil(pigment.light, 66)} style={{ mixBlendMode: "screen" }}>
            {tree.gaps.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
