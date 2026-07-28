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
      {/* shade: the underside of the canopy — cool green, never heavy */}
      <g className="brush-leaf" filter="url(#brush-leaf)" fill={mix(pigment.grassDeep, 88, pigment.lilac)}>
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
      <g className="brush-leaf" filter="url(#brush-leaf)" fill={pigment.grass}>
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

export function FramingBoughs() {
  return (
    <div className="absolute inset-0" {...parallax(TRAVEL.boughs)}>
      {/* left — always present, larger on small screens where it is the only
          framing element */}
      <div
        className="absolute left-0 top-0 w-[52vw] origin-top-left sm:w-[38vw] lg:w-[30vw]"
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

      {/* right — hidden on phones, where a second bough would close the frame
          in around the text rather than around the view */}
      <div
        className="absolute right-0 top-0 hidden w-[34vw] origin-top-right sm:block lg:w-[27vw]"
        style={{
          aspectRatio: `${BOUGH_VIEW.width} / ${BOUGH_VIEW.height}`,
          transform: "scaleX(-1)",
        }}
      >
        <div
          className="ambient-bough h-full w-full"
          style={{
            transformOrigin: "8% 4%",
            opacity: 0.82,
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
