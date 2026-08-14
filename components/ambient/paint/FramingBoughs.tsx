import { DEFAULT_COMPOSITION, type Composition } from "@/lib/ambient/composition";
import { parallax, TRAVEL } from "@/lib/ambient/depth";
import { BOUGH_VIEW, paintedBough } from "@/lib/ambient/flora";
import { mix, pigment, veil } from "@/lib/ambient/palette";

/**
 * Blossoming boughs reaching in from both top corners — except that the trees
 * themselves are not in the picture.
 *
 * Only a limb and its leaves come into view. This is the oldest framing device
 * in landscape painting and it is doing three jobs here: it puts something very
 * close to the viewer at the edge of the frame (which is most of why everything
 * else reads as further away), it implies trees far bigger than the screen,
 * and — the reason both corners are used rather than one — it closes the top of
 * the page in.
 *
 * That last one is the whole point. One bough frames a view; two boughs make a
 * room. Combined with the meadow rising at the left and right edges below, the
 * page ends up with foliage in all four corners and clear air in the middle,
 * so the reader is sitting *inside* the garden with the book in their lap
 * rather than looking at a landscape from outside it. Intimacy is a
 * composition, not a colour.
 *
 * The leaves are painted in three tonal passes rather than as leaf shapes:
 * shade, body, then the few clusters the sun is actually on. Real foliage is
 * read as *volume and light*, never as individual leaves, and a repeated leaf
 * glyph is the fastest way to make a tree look like clip art. Twigs go between
 * the shade and body passes so a few show through and the rest are buried,
 * which is what stops the mass reading as a green cloud. Blossom rides on the
 * outside of the canopy, where it would actually get the light.
 *
 * The right-hand bough is the same generator with a different seed, mirrored —
 * mirroring alone would be visible immediately, so the geometry differs too.
 */
function Bough({ seed }: { seed: number }) {
  const bough = paintedBough(seed);

  return (
    <svg
      viewBox={`0 0 ${BOUGH_VIEW.width} ${BOUGH_VIEW.height}`}
      width="100%"
      height="100%"
      fill="none"
      style={{ overflow: "visible", display: "block" }}
    >
      {/*
        Shade: the underside of the canopy. This is the nearest foliage in the
        frame and therefore the darkest — the boughs are what the reader is
        looking *through*, and a canopy with no dark underside reads as a decal
        stuck on the corner of the screen. Kept in step with `BigTree`'s canopy
        on purpose; see the value-range note in lib/ambient/palette.ts.
      */}
      <g className="brush-leaf" filter="url(#brush-leaf)" fill={pigment.canopyShade}>
        {bough.shadow.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* structure, mostly buried */}
      <g filter="url(#brush-prop)">
        <g fill={veil(pigment.bark, 88)}>
          {bough.limbs.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g stroke={veil(pigment.bark, 62)} strokeWidth="1.7" strokeLinecap="round">
          {bough.twigs.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>

      {/* the body of the canopy */}
      <g className="brush-leaf" filter="url(#brush-leaf)" fill={pigment.canopyMid}>
        {bough.mid.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* the leaves the afternoon reaches */}
      <g className="brush-leaf" filter="url(#brush-leaf)" fill={mix(pigment.grassLit, 84, pigment.butter)}>
        {bough.lit.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* blossom, out where the light is */}
      <g className="brush-leaf" filter="url(#brush-leaf)">
        {bough.blossoms.map((d, i) => (
          <path key={i} d={d} fill={veil(pigment.blossom, i % 3 === 0 ? 94 : 66)} />
        ))}
      </g>

      {/* chinks of sky through the leaves */}
      <g fill={veil(pigment.light, 62)} style={{ mixBlendMode: "screen" }}>
        {bough.gaps.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Where the two boughs come in from, per composition.
 *
 * A bough is drawn into an aspect-locked box, so like the tree it was never
 * distorted by the tall frame — it was framing the wrong thing. In landscape
 * the pair hang from the two top corners, which is where the frame's corners
 * are. A portrait frame's top corners are barely a third as far apart, so the
 * same staging put both boughs in a huddle over the middle of the sky and
 * closed nothing in; that is why the right-hand one was simply hidden below
 * `sm`, leaving a phone with a single bough and an open right edge.
 *
 * Portrait brings them in from the **sides** instead: the left one still hangs
 * from its corner and reaches down the left edge, and the right one enters
 * lower, from the right edge, well below it. Two boughs at different heights on
 * opposite edges close a tall frame the way two top corners close a wide one —
 * and the asymmetry is doing real work, because a pair placed symmetrically in
 * a narrow frame reads as a wreath around the text rather than as branches you
 * are sitting under.
 *
 * The middle of the frame stays open in both, which is the rule that actually
 * matters: foliage in the corners, clear air where the book is.
 */
type BoughPlacement = {
  /** Whole class strings — the Tailwind scanner only generates what it sees. */
  readonly left: string;
  readonly right: string;
  readonly rightOpacity: number;
};

const BOUGH_STAGE: Record<Composition, BoughPlacement> = {
  landscape: {
    left: "absolute left-0 top-0 w-[52vw] sm:w-[38vw] lg:w-[30vw]",
    // Hidden on phones, where a second bough hanging beside the first would
    // close the frame in around the text rather than around the view.
    right: "absolute right-0 top-0 hidden w-[34vw] sm:block lg:w-[27vw]",
    rightOpacity: 0.82,
  },
  portrait: {
    left: "absolute left-0 top-0 w-[74vw]",
    // Far enough off the edge that the limb's root is out of frame, the way
    // the left one's is — only the branch comes into view.
    right: "absolute right-[-8vw] top-[16vh] w-[50vw]",
    rightOpacity: 0.8,
  },
};

export function FramingBoughs({
  composition = DEFAULT_COMPOSITION,
}: {
  composition?: Composition;
}) {
  const stage = BOUGH_STAGE[composition];

  return (
    <div className="absolute inset-0" {...parallax(TRAVEL.boughs)}>
      {/* left — always present, and the only framing element on a narrow
          landscape fallback */}
      <div
        className={stage.left}
        style={{ aspectRatio: `${BOUGH_VIEW.width} / ${BOUGH_VIEW.height}` }}
      >
        <div
          className="ambient-bough h-full w-full"
          style={{
            transformOrigin: "8% 4%",
            opacity: 0.94,
            animation: "bough-sway 23s ease-in-out infinite",
          }}
        >
          <Bough seed={8807} />
        </div>
      </div>

      {/* right — mirrored, and a different seed, because mirroring alone is
          visible immediately */}
      <div
        className={stage.right}
        style={{
          aspectRatio: `${BOUGH_VIEW.width} / ${BOUGH_VIEW.height}`,
          transform: "scaleX(-1)",
        }}
      >
        <div
          className="ambient-bough h-full w-full"
          style={{
            transformOrigin: "8% 4%",
            opacity: stage.rightOpacity,
            animation: "bough-sway 31s ease-in-out infinite",
            animationDelay: "-9s",
          }}
        >
          <Bough seed={4409} />
        </div>
      </div>
    </div>
  );
}
