import { parallax, TRAVEL } from "@/lib/ambient/depth";
import { paintedTree, TREE_VIEW } from "@/lib/ambient/flora";
import { mix, pigment, veil } from "@/lib/ambient/palette";
import { swing } from "@/lib/ambient/props";

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
export function BigTree() {
  const tree = paintedTree(6247);
  const ropes = swing(tree.swingAnchor, { drop: 132, width: 44, seed: 1553 });

  return (
    <div className="absolute inset-0" style={{ transform: parallax(TRAVEL.tree) }}>
      <div
        className="absolute bottom-[16vh] left-[-6vw] w-[52vw] sm:bottom-[18vh] sm:left-[1vw] sm:w-[34vw] lg:w-[27vw]"
        style={{ aspectRatio: `${TREE_VIEW.width} / ${TREE_VIEW.height}` }}
      >
        <svg
          viewBox={`0 0 ${TREE_VIEW.width} ${TREE_VIEW.height}`}
          width="100%"
          height="100%"
          fill="none"
          style={{ overflow: "visible", display: "block" }}
        >
          {/* the pool of shade it throws on the grass */}
          <g filter="url(#brush-shade)">
            <path d={tree.groundShade} fill={veil(pigment.shadow, 24)} />
          </g>

          {/* trunk and limbs */}
          <g filter="url(#brush-prop)">
            <path d={tree.trunk} fill={pigment.bark} />
            <path d={tree.trunk} fill={veil(pigment.barkLit, 40)} transform="translate(4 0)" />
            <g fill={pigment.bark}>
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

          {/* canopy: shade, structure showing through, body, then the light */}
          <g className="brush-leaf" filter="url(#brush-leaf)" fill={mix(pigment.grassDeep, 88, pigment.lilac)}>
            {tree.shadow.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g filter="url(#brush-prop)" stroke={veil(pigment.bark, 52)} strokeWidth="1.6" strokeLinecap="round">
            {tree.twigs.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g className="brush-leaf" filter="url(#brush-leaf)" fill={pigment.grass}>
            {tree.mid.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g className="brush-leaf" filter="url(#brush-leaf)" fill={mix(pigment.grassLit, 86, pigment.butter)}>
            {tree.lit.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* blossom */}
          <g className="brush-leaf" filter="url(#brush-leaf)">
            {tree.blossoms.map((d, i) => (
              <path key={i} d={d} fill={veil(pigment.blossom, i % 3 === 0 ? 92 : 68)} />
            ))}
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
