import { DEFAULT_COMPOSITION, type Composition } from "@/lib/ambient/composition";
import { TRAVEL } from "@/lib/ambient/depth";
import { pathVerge } from "@/lib/ambient/flora";
import { depthPigment, mix, pigment, species, veil } from "@/lib/ambient/palette";
import type { Point } from "@/lib/ambient/path";
import {
  bench,
  bridge,
  fenceLine,
  footpath,
  lanternString,
  steppingStones,
  stream,
} from "@/lib/ambient/props";
import {
  forestCrowns,
  HILL_STAGE,
  ridgeBand,
  ridgeBody,
  ridgeSamples,
  slopeBlooms,
  slopePatches,
  type HillStage,
  type RidgeSpec,
} from "@/lib/ambient/terrain";

/**
 * The garden's green bowl, in five low rises, plus everything two people have
 * left lying around in it.
 *
 * Each ridge is the same handful of passes, scaled by how far away it is: the
 * body in its depth pigment and its own brush, a sunlit band along the crest, a
 * cool band on the side turned away, blurred masses of scrub, drifts of flowers
 * as specks of colour, and — on the far rises only — a soft treeline.
 *
 * Detail thins as things recede, which is the half of aerial perspective people
 * forget: distance doesn't only wash colour out, it *deletes detail*. But the
 * ramp here is deliberately short, and the far side never gets more than about
 * two-thirds of the way to the sky's colour. This is a place you could walk
 * across, not a vista — the far hedge should still be green.
 *
 * Split across two SVGs sharing one viewBox so the front half can have its own
 * parallax. They must keep identical geometry — same stage, same height, same
 * offset — or the ridges stop nesting.
 *
 * ## Composition
 *
 * Everything geometric here comes from `HILL_STAGE[composition]` rather than
 * from constants in this file, because `preserveAspectRatio="none"` distorts a
 * fixed viewBox into a frame of a different shape and the tall frame therefore
 * needs its own ridges, its own horizon and its own prop placement rather than
 * the wide one squeezed. The prop is only ever passed by the bake easel; see
 * `lib/ambient/composition.ts`.
 */

const HUES = [species.pink.petal, species.daisy.petal, species.buttercup.petal, species.lavender.petal];

function Ridge({ spec, points, stage }: { spec: RidgeSpec; points: Point[]; stage: HillStage }) {
  const fill = depthPigment(spec.depth, spec.warmth);
  const crowns = spec.forest ? forestCrowns(points, spec, spec.forest, stage) : [];
  const detail = 1 - spec.depth;

  return (
    <g className={`brush-${spec.id}`} filter={`url(#brush-${spec.id})`}>
      <path d={ridgeBody(points, stage)} fill={fill} />

      {/* the crest, where the afternoon lands */}
      <path
        d={ridgeBand(
          points,
          stage.crest.from,
          stage.crest.to,
          (8 + detail * 18) * stage.scale,
          spec.seed + 5,
        )}
        fill={veil(pigment.grassLit, 18 + detail * 26)}
      />
      {/* and the side turned away from it — cool and green, never dark */}
      <path
        d={ridgeBand(
          points,
          stage.shade.from,
          stage.shade.to,
          (10 + detail * 22) * stage.scale,
          spec.seed + 9,
        )}
        fill={veil(pigment.shadow, 4 + detail * 9)}
      />

      {crowns.length > 0 && (
        <g fill={mix(fill, 72, pigment.grassDeep)}>
          {crowns.map((crown, i) => (
            <path key={i} d={crown.d} />
          ))}
        </g>
      )}
    </g>
  );
}

function Slope({ spec, points, stage }: { spec: RidgeSpec; points: Point[]; stage: HillStage }) {
  const blooms = slopeBlooms(
    points,
    spec,
    stage.blooms.base + Math.round((1 - spec.depth) * stage.blooms.spread),
    stage,
  );

  return (
    <>
      {spec.patches ? (
        <g filter="url(#brush-shade)" fill={veil(pigment.shadow, 8 + (1 - spec.depth) * 8)}>
          {slopePatches(points, spec, spec.patches, stage).map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ) : null}

      <g opacity={0.85 - spec.depth * 0.35}>
        {blooms.map((bloom, i) => (
          <circle key={i} cx={bloom.x} cy={bloom.y} r={bloom.r} fill={HUES[bloom.hue]} />
        ))}
      </g>
    </>
  );
}

/** The two far rises — the other side of the bowl. */
export function FarRange({ composition = DEFAULT_COMPOSITION }: { composition?: Composition }) {
  const stage = HILL_STAGE[composition];
  const sampled = stage.ridges
    .slice(0, 2)
    .map((spec) => ({ spec, points: ridgeSamples(spec, stage) }));

  return (
    <svg
      className={`absolute left-0 w-full ${stage.frame.heightClass}`}
      viewBox={`0 0 ${stage.view.width} ${stage.view.height}`}
      preserveAspectRatio="none"
      fill="none"
      style={{
        bottom: stage.frame.bottom,
        transform: "translate3d(0, 0, 0)",
      }}
      data-parallax={TRAVEL.rangeFar}
    >
      {sampled.map(({ spec, points }) => (
        <g key={spec.id}>
          <Ridge spec={spec} points={points} stage={stage} />
          <Slope spec={spec} points={points} stage={stage} />
        </g>
      ))}
    </svg>
  );
}

/**
 * The near rises, and the story.
 *
 * Placement here is the composition doing emotional work, so it is worth being
 * explicit about it:
 *
 * - The **creek and the little bridge** sit in the fold between two rises and
 *   are cut off halfway by the near bank. Something that continues out of sight
 *   is what makes a picture feel like it has a world behind it.
 * - The **fence** runs along the left, receding, with a **string of lanterns**
 *   hung between two of its posts. The lanterns are unlit — it is the middle of
 *   the afternoon — and an unlit lantern is a promise about the evening.
 * - The **bench** sits on the right, turned to face the sun rather than to face
 *   the viewer. Furniture aimed at a view is furniture somebody sits in on
 *   purpose.
 * - The **path** leaves the bottom of the frame, wide enough for two, lined
 *   with flowers, with **stepping stones** worn into its lower stretch, and
 *   disappears over the knoll.
 *
 * All of it is low-contrast and small. The moment any one of these becomes
 * something you *look at*, it has stopped working.
 *
 * Every one of those relationships is preserved in both compositions and none
 * of the coordinates are — the numbers come from `stage.props`, because the
 * ridges are at different heights in a tall frame and `sampleAt` puts each
 * object on the ground it actually finds.
 */
export function NearHills({ composition = DEFAULT_COMPOSITION }: { composition?: Composition }) {
  const stage = HILL_STAGE[composition];
  const plan = stage.props;
  const sampled = stage.ridges.slice(2).map((spec) => ({ spec, points: ridgeSamples(spec, stage) }));

  const fold = sampled[0].points; // knoll — the fold the creek runs into
  const bank = sampled[1].points; // near — where the fence and bench stand
  const water = stream(fold, { ...plan.stream, scale: stage.scale });
  const span = bridge(fold, plan.bridge);
  const fence = fenceLine(bank, plan.fence);
  const lanterns = lanternString(
    {
      x: fence.posts[plan.lanterns.fromPost].x,
      y: fence.posts[plan.lanterns.fromPost].y - fence.posts[plan.lanterns.fromPost].height,
    },
    {
      x: fence.posts[plan.lanterns.toPost].x,
      y: fence.posts[plan.lanterns.toPost].y - fence.posts[plan.lanterns.toPost].height,
    },
    { ...plan.lanterns, scale: stage.scale },
  );
  const seat = bench(bank, plan.bench);
  const trail = footpath(plan.path);
  const stones = steppingStones(trail.centre[plan.stones.from], trail.centre[plan.stones.to], {
    ...plan.stones,
    scale: stage.scale,
  });
  const verge = pathVerge(trail.centre, stage.scale);

  return (
    <svg
      className={`absolute left-0 w-full ${stage.frame.heightClass}`}
      viewBox={`0 0 ${stage.view.width} ${stage.view.height}`}
      preserveAspectRatio="none"
      fill="none"
      style={{
        bottom: stage.frame.bottom,
        transform: "translate3d(0, 0, 0)",
      }}
      data-parallax={TRAVEL.hillsNear}
    >
      <g>
        <Ridge spec={sampled[0].spec} points={fold} stage={stage} />
        <Slope spec={sampled[0].spec} points={fold} stage={stage} />
      </g>

      {/* the creek, carrying a stripe of sky down the fold */}
      <g filter="url(#brush-prop)">
        <path d={water} fill={veil(pigment.water, 82)} />
        <path d={water} fill={veil(pigment.light, 30)} />
      </g>

      {/* the bridge where you stop in the middle */}
      <g filter="url(#brush-prop)">
        <path d={span.deck} fill={veil(pigment.wood, 76)} />
        <path
          d={span.rail}
          stroke={veil(pigment.wood, 62)}
          strokeWidth={1.6 * stage.scale}
          strokeLinecap="round"
          fill="none"
        />
        {span.posts.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={veil(pigment.wood, 54)}
            strokeWidth={1.4 * stage.scale}
            strokeLinecap="round"
          />
        ))}
      </g>

      {sampled.slice(1).map(({ spec, points }) => (
        <g key={spec.id}>
          <Ridge spec={spec} points={points} stage={stage} />
          <Slope spec={spec} points={points} stage={stage} />
        </g>
      ))}

      {/* the fence, and the lanterns waiting for the evening */}
      <g filter="url(#brush-prop)">
        {fence.rails.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={veil(pigment.wood, 34)}
            strokeWidth={1.5 * stage.scale}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {fence.posts.map((post, i) => (
          <path
            key={i}
            d={`M${post.x} ${post.y} L${post.x + ((i % 3) - 1) * stage.scale} ${post.y - post.height}`}
            stroke={veil(pigment.wood, 46)}
            strokeWidth={(2.4 - (i / fence.posts.length) * 1.2) * stage.scale}
            strokeLinecap="round"
          />
        ))}
        <path
          d={lanterns.cord}
          stroke={veil(pigment.wood, 30)}
          strokeWidth={0.8 * stage.scale}
          fill="none"
        />
        {lanterns.lamps.map((lamp, i) => (
          <g key={i}>
            <ellipse cx={lamp.x} cy={lamp.y} rx={lamp.r * 0.8} ry={lamp.r} fill={veil(pigment.lantern, 82)} />
            <ellipse cx={lamp.x} cy={lamp.y - lamp.r * 0.3} rx={lamp.r * 0.5} ry={lamp.r * 0.5} fill={veil(pigment.sparkle, 60)} />
            {/*
             * The flame, dark every day except the 5th — `opacity: 0` here and
             * lit by the one `[data-celebration="true"] .lantern-flame` rule in
             * globals.css. Rendered always rather than conditionally so it
             * costs no re-render and cannot cause a hydration mismatch: whether
             * today is a celebration is a client-only question (the dev
             * override lives in localStorage) and the server must not try to
             * answer it.
             */}
            <g className="lantern-flame" style={{ opacity: 0 }}>
              <ellipse
                cx={lamp.x}
                cy={lamp.y}
                rx={lamp.r * 2.6}
                ry={lamp.r * 2.6}
                fill={veil(pigment.sunGlow, 26)}
              />
              <ellipse
                cx={lamp.x}
                cy={lamp.y}
                rx={lamp.r * 0.46}
                ry={lamp.r * 0.62}
                fill={veil(pigment.sparkle, 92)}
              />
            </g>
          </g>
        ))}
      </g>

      {/* the bench, facing the light */}
      <g filter="url(#brush-prop)">
        <path d={seat.back} fill={veil(pigment.wood, 68)} />
        <path d={seat.seat} fill={veil(pigment.wood, 78)} />
        {[...seat.legs, ...seat.arms].map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={veil(pigment.wood, 62)}
            strokeWidth={1.6 * stage.scale}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* the path out of the bottom of the frame */}
      <g filter="url(#brush-prop)">
        <path d={trail.body} fill={veil(pigment.path, 58)} />
        <path
          d={trail.body}
          fill={veil(pigment.shadow, 6)}
          transform={`translate(${-3 * stage.scale} ${2 * stage.scale})`}
        />
        {stones.map((stone, i) => (
          <path key={i} d={stone.d} fill={veil(pigment.stone, 62)} />
        ))}
      </g>

      {/* flowers along both sides of it */}
      <g>
        {verge.map((bloom, i) => (
          <circle
            key={i}
            cx={bloom.x}
            cy={bloom.y}
            r={bloom.r}
            fill={species[bloom.species].petal}
            opacity={0.9}
          />
        ))}
      </g>
    </svg>
  );
}
