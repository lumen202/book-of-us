/**
 * Growing things: the blossom boughs that frame the picture, the big tree the
 * swing hangs from, and the flower meadow you are standing in.
 *
 * Two rules the whole file is written around.
 *
 * **Nothing is ever drawn twice.** Not one leaf sprite repeated forty times,
 * not one flower recoloured six ways, not one blade of grass mirrored across
 * the bottom of the screen. Every blade, petal, blossom and leaf mass gets its
 * own dimensions from the seeded `Rng`. Repetition is what the eye catches
 * first and what instantly reads as "generated", and it costs nothing to avoid
 * when the geometry is generated anyway.
 *
 * **Flowers come in drifts, not sprinkles.** Seed spreads outward from where it
 * fell, so a real meadow is patches of one species running into patches of
 * another, with bare green between them. Scattering six species uniformly
 * across the field is the difference between a meadow and confetti — and this
 * garden is meant to be one someone would pick flowers in, which means the
 * flowers have to look pickable.
 *
 * Foliage is grouped by *tone* rather than by object, because that is how it
 * gets painted: the whole canopy's shade goes down first, then the body, then
 * the few clusters the sun actually reaches. Grouping this way also means three
 * filter applications for a whole tree instead of eighty, which is what keeps
 * this affordable.
 */
import { DEFAULT_COMPOSITION, type Composition } from "./composition";
import { blobPath, catmullRomPath, type Point } from "./path";
import { SPECIES_NAMES, type SpeciesName } from "./palette";
import { makeRng, type Rng } from "./rng";

/**
 * The bough and tree view boxes are *not* composition-dependent, and that is
 * worth saying out loud because the meadow below is.
 *
 * Both are drawn into containers carrying a matching `aspectRatio`, so neither
 * was ever stretched by `preserveAspectRatio="none"` — the tall-frame problem
 * for these two is placement, not geometry. A portrait frame needs the tree
 * moved and re-scaled and the boughs brought in from the sides rather than the
 * top corners, and both of those belong to the container. See `TREE_STAGE` in
 * `paint/BigTree.tsx` and `BOUGH_STAGE` in `paint/FramingBoughs.tsx`.
 */
export const BOUGH_VIEW = { width: 520, height: 520 } as const;
export const TREE_VIEW = { width: 460, height: 520 } as const;

/** The sun sits high and to the right, so light arrives travelling down-left.
 *  Every tonal decision in this file is made against this vector. */
const LIGHT = { x: 0.82, y: -0.58 };

/* -------------------------------------------------------------------------- */
/* Canopies                                                                   */
/* -------------------------------------------------------------------------- */

export type Canopy = {
  /** Structural limbs, drawn as tapered shapes rather than strokes — a stroke
   *  of constant width is a pipe, not a branch. */
  limbs: string[];
  twigs: string[];
  /** Painting order: shade, body, sunlit leaves. */
  shadow: string[];
  mid: string[];
  lit: string[];
  /**
   * The blossom, in the same three tones as the leaves beneath it.
   *
   * Three arrays rather than one, because these trees are cherry: blossom is
   * the *mass* of the canopy here, not a decoration scattered over it, and any
   * mass painted in a single flat colour reads as a sticker. It needs the same
   * shade/body/light banding a green canopy gets — see `pigment.cherry*` in
   * `palette.ts` for why pink is the harder of the two to keep from going flat.
   */
  blossomShade: string[];
  blossomMid: string[];
  blossomLit: string[];
  /** The white touched onto the centres of the lit clumps — tiny, sparse,
   *  and the pass that makes the canopy luminous. See `pigment.cherryHigh`. */
  blossomHigh: string[];
  /** Chinks of open sky the light comes through. */
  gaps: string[];
};

function emptyCanopy(): Canopy {
  return {
    limbs: [],
    twigs: [],
    shadow: [],
    mid: [],
    lit: [],
    blossomShade: [],
    blossomMid: [],
    blossomLit: [],
    blossomHigh: [],
    gaps: [],
  };
}

/** A limb that thins as it goes, built as a closed shape around a quadratic. */
function taperedLimb(from: Point, to: Point, bend: Point, w0: number, w1: number): string {
  const nx = -(to.y - from.y);
  const ny = to.x - from.x;
  const len = Math.hypot(nx, ny) || 1;
  const ux = nx / len;
  const uy = ny / len;

  return (
    `M${from.x + ux * w0} ${from.y + uy * w0}` +
    ` Q${bend.x + ux * ((w0 + w1) / 2)} ${bend.y + uy * ((w0 + w1) / 2)} ${to.x + ux * w1} ${to.y + uy * w1}` +
    ` L${to.x - ux * w1} ${to.y - uy * w1}` +
    ` Q${bend.x - ux * ((w0 + w1) / 2)} ${bend.y - uy * ((w0 + w1) / 2)} ${from.x - ux * w0} ${from.y - uy * w0} Z`
  );
}

/**
 * A clump of leaves as one painted mass.
 *
 * Blobs are scattered in an ellipse and sorted into three tones by how far
 * along the light vector they sit, so a mass is soft underneath and catches
 * light on its upper-right shoulder — the shading that makes a flat cluster
 * turn into a volume. The blobs are kept round and slightly overlapping rather
 * than spiky: a rounded canopy is a canopy you would sit under.
 */
function leafMass(
  rand: Rng,
  opts: {
    cx: number;
    cy: number;
    spread: number;
    radius: number;
    count: number;
    /** Chance a blob also carries blossom. */
    blossom?: number;
    /**
     * Paint this mass as cherry rather than as a green tree wearing blossom.
     *
     * It changes three things at once, and they only work together: blossom
     * covers nearly every blob instead of a third of them, the clumps are large
     * enough to read as the canopy's own surface rather than as dots on it, and
     * they are allowed in toward the middle of the mass instead of being kept
     * to the outside. Turn on any one alone and the tree looks diseased rather
     * than in flower.
     *
     * The green passes underneath are deliberately still generated in full.
     * They are what shows through the gaps and around the edges, and they are
     * the reason the canopy has structure at all — a cherry tree in blossom is
     * not a pink cloud, it is a tree you can still see the shape of.
     */
    cherry?: boolean;
  },
  into: Canopy,
): void {
  for (let i = 0; i < opts.count; i += 1) {
    const angle = rand.float(0, Math.PI * 2);
    const dist = Math.sqrt(rand.float()) * opts.spread;
    const cx = opts.cx + Math.cos(angle) * dist;
    const cy = opts.cy + Math.sin(angle) * dist * 0.8;
    const r = rand.mid(opts.radius * 0.5, opts.radius);

    const d = blobPath(rand, {
      cx,
      cy,
      radius: r,
      wobble: 0.32,
      points: rand.int(8, 11),
      squash: rand.float(0.76, 1),
    });

    // How far up the light vector this blob sits, normalised to the mass.
    const lift = ((cx - opts.cx) * LIGHT.x + (cy - opts.cy) * LIGHT.y) / (opts.spread || 1);
    const litBlob = lift > 0.38 && rand.chance(0.78);
    /*
     * On a cherry, about half the green never gets painted at all. The blossom
     * is the canopy's surface, so green survives as glimpses — painting a full
     * green mass under every clump made the tree read as a green tree wearing
     * pink, however much blossom went over it. The blob's *tone* is still
     * computed either way, because the blossom above inherits it.
     */
    if (!opts.cherry || rand.chance(0.32)) {
      if (litBlob) into.lit.push(d);
      else if (lift < -0.2) into.shadow.push(d);
      else into.mid.push(d);
    }

    if (opts.cherry) {
      /*
       * The stipple — the whole difference between "pink patches" and a
       * hand-painted cherry.
       *
       * An earlier version painted one blossom clump per leaf blob, nearly the
       * blob's own size, and it read as a collage of flat pink cutouts however
       * the tones were tuned. The reference look (and every cherry tutorial's
       * actual instruction) is the opposite grain: MANY small dots, spaced
       * unevenly, layered so the dark sits beneath and the light above, with
       * white touched sparingly onto the sunlit centres. So every leaf blob
       * scatters a handful of small clumps over itself instead of one big one.
       *
       * The tones dither rather than band: each clump mostly inherits its
       * blob's tone but steps up or down one in four times, so adjacent tones
       * interleave along the boundary and the canopy grades instead of
       * striping. The brush-leaf displacement (scale 17) then shreds these
       * small shapes far more than it ever marked the big ones — at this size
       * that shredding IS the feathered petal edge.
       *
       * Node budget: this multiplies blossom paths several-fold, which is fine
       * because the cherry layers are baked — the phone decodes pixels. The
       * live SVG fallback carries the extra paths but they are static and
       * filtered once. Do not add per-clump animation here.
       */
      if (opts.blossom && rand.chance(opts.blossom)) {
        const clumps = rand.int(3, 5);
        for (let c = 0; c < clumps; c += 1) {
          const bloom = blobPath(rand, {
            cx: cx + rand.around(0, r * 0.72),
            cy: cy + rand.around(0, r * 0.6),
            radius: r * rand.float(0.2, 0.42),
            wobble: 0.5,
            points: rand.int(5, 7),
            squash: rand.float(0.7, 1),
          });

          // Mostly inherit the blob's tone; one in four steps toward the
          // neighbouring band, which is what turns banding into gradation.
          const step = rand.chance(0.25);
          if (litBlob) (step ? into.blossomMid : into.blossomLit).push(bloom);
          else if (lift < -0.2) (step ? into.blossomMid : into.blossomShade).push(bloom);
          else (step ? (rand.chance(0.5) ? into.blossomLit : into.blossomShade) : into.blossomMid).push(bloom);
        }

        // White, touched onto the centre of a lit clump. Sparse on purpose.
        if (litBlob && rand.chance(0.55)) {
          into.blossomHigh.push(
            blobPath(rand, {
              cx: cx + rand.around(0, r * 0.4),
              cy: cy - rand.float(0, r * 0.35),
              radius: r * rand.float(0.12, 0.24),
              wobble: 0.5,
              points: 5,
              squash: rand.float(0.7, 1),
            }),
          );
        }
      }
    } else if (opts.blossom && rand.chance(opts.blossom) && dist > opts.spread * 0.35) {
      // The leafy-tree case: blossom is a garnish riding on the outside of the
      // mass, where it would actually get the light — never buried in the
      // middle, where it would read as noise.
      const bloom = blobPath(rand, {
        cx: cx + rand.around(0, r * 0.5),
        cy: cy + rand.around(0, r * 0.5),
        radius: r * rand.float(0.16, 0.34),
        wobble: 0.42,
        points: rand.int(6, 8),
        squash: rand.float(0.7, 1),
      });
      if (litBlob) into.blossomLit.push(bloom);
      else if (lift < -0.2) into.blossomShade.push(bloom);
      else into.blossomMid.push(bloom);
    }
  }
}

/**
 * A blossoming bough reaching in from a top corner.
 *
 * The trees themselves are off-frame. Only a limb and its leaves come into
 * view, which is the oldest framing device in landscape painting and is doing
 * three jobs at once: it puts something very close to the viewer at the edge of
 * the frame, it implies a tree far bigger than the screen, and it closes the
 * top corners so the page feels *sheltered* rather than open. That last one is
 * the whole reason both corners are used — a single bough frames a view, two
 * boughs make a room.
 */
export function paintedBough(seed: number): Canopy {
  const rand = makeRng(seed);
  const canopy = emptyCanopy();

  const root: Point = { x: -30, y: rand.around(44, 14) };
  const tips: Point[] = [];

  const main: Point = { x: rand.around(320, 30), y: rand.around(190, 28) };
  canopy.limbs.push(taperedLimb(root, main, { x: 150, y: rand.around(84, 18) }, 25, 7));
  tips.push(main);

  for (let i = 0; i < 4; i += 1) {
    const t = 0.28 + i * 0.2;
    const from: Point = { x: root.x + (main.x - root.x) * t, y: root.y + (main.y - root.y) * t * 0.8 };
    const to: Point = { x: from.x + rand.float(70, 165), y: from.y + rand.float(-36, 140) };
    canopy.limbs.push(
      taperedLimb(from, to, { x: (from.x + to.x) / 2, y: from.y + rand.around(0, 38) }, 9 - i, 2.4),
    );
    tips.push(to);
  }

  for (let i = 0; i < 9; i += 1) {
    const anchor = rand.pick(tips);
    canopy.twigs.push(
      catmullRomPath([
        anchor,
        { x: anchor.x + rand.around(30, 26), y: anchor.y + rand.around(24, 30) },
        { x: anchor.x + rand.around(64, 32), y: anchor.y + rand.around(50, 38) },
      ]),
    );
  }

  // Tighter masses than the old leafy version (spread 152/104 → 110/72): a
  // cherry bough is clumps of blossom strung along a visible dark limb, and
  // the limb showing between them is what the corner framing is made of.
  leafMass(
    rand,
    { cx: 40, cy: 16, spread: 112, radius: 40, count: 24, blossom: 0.97, cherry: true },
    canopy,
  );
  for (const tip of tips) {
    leafMass(
      rand,
      {
        cx: tip.x + rand.around(0, 20),
        cy: tip.y + rand.around(0, 20),
        spread: rand.float(40, 76),
        radius: rand.float(19, 32),
        count: rand.int(13, 17),
        blossom: 0.96,
        cherry: true,
      },
      canopy,
    );
  }

  for (let i = 0; i < 14; i += 1) {
    const anchor = rand.pick(tips);
    canopy.gaps.push(
      blobPath(rand, {
        cx: anchor.x + rand.around(0, 78),
        cy: anchor.y + rand.around(0, 62),
        radius: rand.float(2.6, 8),
        wobble: 0.45,
        points: 6,
      }),
    );
  }

  return canopy;
}

export type Tree = Canopy & {
  trunk: string;
  /** Where the swing's ropes are tied. On a low branch, off to one side. */
  swingAnchor: Point;
  /** The tree's own shadow, pooling on the grass. */
  groundShade: string;
  /**
   * Petals lying on the grass under the canopy, sorted by tone like everything
   * else. A cherry that is dropping petals all afternoon stands in a drift of
   * them — the ground is half the reason the falling ones read as real, because
   * it answers the question of where they go.
   */
  fallenPetals: { d: string; tone: number }[];
};

/**
 * The big tree. The one everything else in the garden is arranged around.
 *
 * A cherry in full bloom on a warm curved trunk. It used to be a broad green
 * dome — "the shape a child draws" — and the dome generator survived being
 * recoloured pink exactly as badly as you'd guess: a pink glob. A cherry is
 * the opposite silhouette, drawn by its *branches*: dark limbs that fork and
 * reach and stay visible, blossom hanging on them in distinct clumps, and sky
 * showing between the clumps. So the canopy is built as one modest mass per
 * branch point rather than four overlapping domes, and about half the green
 * under the blossom is never painted at all (see `leafMass`).
 *
 * One low branch reaches out further than the others. That is not decoration:
 * it is the branch the swing hangs from, and the whole tree is composed to make
 * that branch look like the obvious place to hang one.
 */
export function paintedTree(seed: number): Tree {
  const rand = makeRng(seed);
  const canopy = emptyCanopy();
  const w = TREE_VIEW.width;
  const h = TREE_VIEW.height;

  const base: Point = { x: w * 0.46, y: h };
  const crotch: Point = { x: w * 0.5 + rand.around(0, 14), y: h * 0.5 };

  const trunk = taperedLimb(
    base,
    crotch,
    { x: w * 0.44 + rand.around(0, 10), y: h * 0.74 },
    // Slimmer than the old broadleaf's trunk: cherry wood is slender, and the
    // slenderness is part of why the canopy reads as floating blossom.
    rand.float(12, 16),
    rand.float(6, 9),
  );

  // The branch the swing hangs from: low, long, and reaching left into the
  // open, so the ropes hang clear of the trunk.
  const swingBranch: Point = { x: w * 0.15 + rand.around(0, 12), y: h * 0.44 + rand.around(0, 10) };
  canopy.limbs.push(
    taperedLimb(
      { x: crotch.x - 4, y: crotch.y + 16 },
      swingBranch,
      { x: w * 0.3, y: h * 0.44 },
      9,
      3.4,
    ),
  );

  /*
   * The branch skeleton — and it IS a skeleton now, not scaffolding.
   *
   * The old generator grew four short limbs and buried them under four big
   * dome masses: right for a leafy broadleaf, where the canopy is a solid
   * volume and structure only peeks through. A cherry is the opposite
   * silhouette. The tree is *drawn by its branches* — dark, visible, reaching —
   * and the blossom hangs on them in distinct clumps with sky in between. So
   * the limbs are longer, there are more of them, most carry a secondary
   * branchlet, and every mass below is anchored to a point ON a branch rather
   * than to the idea of a dome. The glob was the dome's fault.
   */
  const tips: Point[] = [swingBranch];
  const anchors: Point[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI * (0.16 + i * 0.135) - rand.around(0, 0.08);
    const len = rand.float(h * 0.24, h * 0.38);
    const to: Point = {
      x: crotch.x + Math.cos(angle) * len * 1.3,
      y: crotch.y + Math.sin(angle) * len,
    };
    canopy.limbs.push(
      taperedLimb(crotch, to, { x: (crotch.x + to.x) / 2, y: crotch.y - len * 0.3 }, 7 - i * 0.55, 2.1),
    );
    tips.push(to);
    // TWO cluster points along each limb, not one — coverage has to be
    // continuous along the branch or the canopy resolves into bouquets at
    // the tips with bare wood between them.
    for (const t of [0.42, 0.72]) {
      anchors.push({
        x: crotch.x + (to.x - crotch.x) * (t + rand.around(0, 0.05)) + rand.around(0, 8),
        y: crotch.y + (to.y - crotch.y) * (t + rand.around(0, 0.05)) - rand.float(4, 16),
      });
    }

    // Most limbs fork once. The fork is half of what makes a winter-visible
    // branch structure read as cherry rather than as spokes.
    if (rand.chance(0.7)) {
      const from: Point = {
        x: crotch.x + (to.x - crotch.x) * 0.55,
        y: crotch.y + (to.y - crotch.y) * 0.55,
      };
      const fork: Point = { x: from.x + rand.around(0, 44), y: from.y - rand.float(16, 44) };
      canopy.limbs.push(
        taperedLimb(from, fork, { x: (from.x + fork.x) / 2, y: from.y - 12 }, 3.2, 1.4),
      );
      tips.push(fork);
    }
  }

  /*
   * Fewer and shorter than the leafy tree's twigs. Those were "mostly buried"
   * under a solid dome, so their length cost nothing; the cherry canopy is
   * deliberately airy, and at the old length the unburied ones read as bare
   * antennae poking out of the blossom — reported as branches "floating".
   * A twig now reaches at most about one clump-radius past its cluster.
   */
  for (let i = 0; i < 6; i += 1) {
    const anchor = rand.pick(tips);
    canopy.twigs.push(
      catmullRomPath([
        anchor,
        { x: anchor.x + rand.around(0, 20), y: anchor.y - rand.float(4, 18) },
        { x: anchor.x + rand.around(0, 34), y: anchor.y - rand.float(10, 30) },
      ]),
    );
  }

  /*
   * Blossom clusters: one modest mass per tip and per mid-branch anchor,
   * NOT four big domes. Small spreads leave air between the clumps, and the
   * air is the point — the gaps are where the branch shows and where the sky
   * comes through, and they are what stop the canopy congealing back into a
   * glob. The swing branch (tips[0]) stays bare so the ropes hang clear.
   */
  /*
   * The lushness knob, and the lesson of three failed tunings. Pass one made a
   * pink glob (domes recoloured). Pass two anchored everything but tightened
   * the spreads so far the canopy resolved into separate bouquets — "a bald
   * tree". The reference look is a *continuous* cloud of blossom the branches
   * pierce through, and the way to get it without re-floating anything is
   * overlap: every cluster is still seeded ON wood (a tip or a mid-branch
   * anchor, two per limb), but the spreads are wide enough and the counts high
   * enough that neighbouring clusters merge. A clump midway between two
   * branches stops reading as floating the moment it is part of one connected
   * mass — support is read from the mass, not from the nearest limb.
   *
   * If the canopy ever thins again, raise `count` before touching `spread`:
   * count fills, spread scatters.
   */
  for (const p of [...tips.slice(1), ...anchors]) {
    leafMass(
      rand,
      {
        cx: p.x + rand.around(0, 6),
        cy: p.y - rand.float(2, 10),
        spread: rand.float(34, 58),
        radius: rand.float(19, 32),
        count: rand.int(15, 20),
        blossom: 0.97,
        cherry: true,
      },
      canopy,
    );
  }

  /*
   * Two crown masses centred on the upper tips themselves (not on a fixed
   * point — that was the floating-clump mistake). With the cluster field above
   * now continuous, these sit inside supported mass and just round the top of
   * the silhouette off, the way the reference crown reads as one umbrella.
   */
  const upper = [...tips].sort((a, b) => a.y - b.y).slice(0, 3);
  const crown: Point = {
    x: upper.reduce((s, p) => s + p.x, 0) / upper.length,
    y: upper.reduce((s, p) => s + p.y, 0) / upper.length,
  };
  for (let i = 0; i < 2; i += 1) {
    leafMass(
      rand,
      {
        cx: crown.x + rand.around(0, 26),
        cy: crown.y - rand.float(0, 14),
        spread: rand.float(50, 70),
        radius: rand.float(21, 32),
        count: rand.int(14, 18),
        blossom: 0.97,
        cherry: true,
      },
      canopy,
    );
  }

  for (let i = 0; i < 18; i += 1) {
    canopy.gaps.push(
      blobPath(rand, {
        cx: w * 0.5 + rand.around(0, 150),
        cy: h * 0.27 + rand.around(0, 100),
        radius: rand.float(2.4, 7.5),
        wobble: 0.45,
        points: 6,
      }),
    );
  }

  /*
   * The drift of fallen petals. Densest under the canopy's edge — petals slide
   * off the outside of the crown, not out of its middle — and thinning with
   * distance, with a few strays carried further by the same breeze that leans
   * the grass. Squashed flat: a petal on the ground is seen edge-on.
   *
   * Generated last, deliberately: these draws are appended to the end of the
   * seeded sequence, so every part of the tree above keeps the exact geometry
   * it had before petals existed.
   */
  const fallenPetals: { d: string; tone: number }[] = [];
  for (let i = 0; i < 46; i += 1) {
    const stray = rand.chance(0.22);
    const spread = stray ? rand.float(150, 250) : rand.mid(40, 160);
    const angle = rand.float(0, Math.PI * 2);
    fallenPetals.push({
      tone: rand.int(0, 2),
      d: blobPath(rand, {
        cx: w * 0.44 + Math.cos(angle) * spread,
        cy: h - 8 + Math.sin(angle) * spread * 0.1 + rand.around(0, 4),
        radius: rand.float(2.2, 4.6),
        wobble: 0.38,
        points: 6,
        squash: rand.float(0.3, 0.5),
      }),
    });
  }

  return {
    ...canopy,
    trunk,
    swingAnchor: { x: swingBranch.x + 6, y: swingBranch.y + 6 },
    groundShade: blobPath(rand, {
      cx: w * 0.44,
      cy: h - 6,
      radius: 148,
      wobble: 0.26,
      points: 10,
      squash: 0.16,
    }),
    fallenPetals,
  };
}

/* -------------------------------------------------------------------------- */
/* Meadow                                                                     */
/* -------------------------------------------------------------------------- */

/** A blade is a *filled* shape, not a stroke. A constant-width stroke with a
 *  round cap is unmistakably a computer's idea of grass; a blade that is broad
 *  at the base and comes to a point is a plant. */
export type Blade = { d: string; tipX: number; tipY: number; seed: boolean };

export type Tuft = {
  x: number;
  y: number;
  scale: number;
  /** 0 = far side of the meadow, 2 = right at your feet. */
  row: number;
  blades: Blade[];
  /** Degrees of lean. Near grass moves far more than far grass — that
   *  difference *is* the depth cue. */
  sway: number;
  period: number;
  /** Negative delay, staggered by x so the breeze crosses as a wave. */
  phase: number;
};

export type FlowerPart = { d: string; heart: boolean };

export type Flower = {
  x: number;
  y: number;
  scale: number;
  row: number;
  species: SpeciesName;
  parts: FlowerPart[];
  stem: string;
  sway: number;
  period: number;
  phase: number;
};

export type Pebble = { d: string; tone: number };
export type Sparkle = { x: number; y: number; r: number; period: number; phase: number };

export type Meadow = {
  undergrowth: string[];
  tufts: Tuft[];
  flowers: Flower[];
  pebbles: Pebble[];
  sparkles: Sparkle[];
};

/** Rows are the meadow's own depth ramp, independent of the hills behind it. */
type MeadowRow = {
  readonly y: number;
  readonly count: number;
  readonly scale: number;
  readonly sway: number;
  readonly height: number;
};

/**
 * How the foreground is staged in one frame shape.
 *
 * The meadow is the one band that is never baked — the grass wave is the most
 * alive thing in the frame, so it stays live and therefore has to be staged at
 * runtime. See `composition.ts`.
 *
 * Note what does *not* change between the two: blade heights, tuft scales and
 * sway. A meadow unit is about one CSS pixel in both compositions, because both
 * view boxes are sized to the box they are drawn into, so a 52-unit blade is a
 * 52-pixel blade either way. What changes is how many of them fit across, and
 * that is the whole difference between a field seen wide and the same field
 * seen through a narrow window.
 */
export type MeadowStage = {
  readonly view: { readonly width: number; readonly height: number };
  readonly rows: readonly MeadowRow[];
  /** Soft shapeless masses under everything, and the band they sit in. */
  readonly undergrowth: { readonly count: number; readonly from: number; readonly to: number };
  /** Drifts of a single flower species. */
  readonly drifts: number;
  /** How many flowers land in one drift. Portrait runs richer drifts as well as
   *  more of them — see the note on `PORTRAIT_MEADOW`. */
  readonly perDrift: { readonly min: number; readonly max: number };
  readonly pebbles: { readonly count: number; readonly from: number; readonly to: number };
  readonly sparkles: { readonly count: number; readonly from: number; readonly to: number };
};

/**
 * The wide frame. As shipped — and, unlike the hills, still the composition a
 * narrow screen falls back to for its very first paint (see
 * `useSceneComposition`).
 */
const LANDSCAPE_MEADOW: MeadowStage = {
  view: { width: 1440, height: 300 },
  rows: [
    { y: 150, count: 18, scale: 0.5, sway: 1.1, height: 28 },
    { y: 210, count: 16, scale: 0.8, sway: 2, height: 40 },
    { y: 278, count: 13, scale: 1.2, sway: 3.1, height: 52 },
  ],
  undergrowth: { count: 9, from: 200, to: 300 },
  drifts: 12,
  perDrift: { min: 3, max: 6 },
  pebbles: { count: 11, from: 190, to: 290 },
  sparkles: { count: 16, from: 160, to: 292 },
};

/**
 * The tall frame.
 *
 * 430x308 against a box that is `27vh + 56px` tall — which on a 430x932 phone
 * is 430x308 exactly. That is the fix, and it replaces a real hack: the meadow
 * used to handle narrow screens by drawing the SVG at 220% width and pulling it
 * left so the container clipped it, on the reasoning that a *slice* of the field
 * at a sane scale beats the whole field squeezed. It was the right instinct and
 * it still left the grass 1.56x too tall, because a slice fixes how wide a blade
 * is and does nothing about how tall.
 *
 * Two consequences worth knowing. The field is genuinely regenerated at this
 * width rather than cropped, so `edgeBias` — the arch that wraps the foreground
 * around the reading column — now rises at the phone's own left and right edges
 * instead of at the edges of a 1440-wide field the phone could only see the
 * middle of. And the counts come down with the width, because a tuft is the
 * same size in pixels here — but they come down *less than proportionally*.
 * A first pass matched landscape's per-pixel density (6/5/4 tufts, 4 drifts)
 * and the bottom of every page read as an empty lawn: on a phone the meadow
 * is the only part of the garden that survives below the reading column, so
 * it has to carry the "you are sitting in a field" feeling alone. Roughly
 * half of landscape's counts over a third of its width is the density that
 * fills the foreground without turning it into a thicket; the meadow's node
 * budget still lands well under the landscape total.
 */
const PORTRAIT_MEADOW: MeadowStage = {
  view: { width: 430, height: 308 },
  rows: [
    { y: 154, count: 9, scale: 0.5, sway: 1.1, height: 28 },
    { y: 216, count: 7, scale: 0.8, sway: 2, height: 40 },
    { y: 285, count: 6, scale: 1.2, sway: 3.1, height: 52 },
  ],
  undergrowth: { count: 5, from: 205, to: 308 },
  /*
   * Far more flower drifts than a per-pixel scaling of landscape would give
   * (7 -> 16, each drift richer too). The phone is the primary surface, and on
   * it the meadow band is the only garden left below the reading column: the
   * bottom of every page ends in it. At landscape density that stretch read as
   * a plain green lawn while the same field looked lush on a desktop, because
   * desktop shows the hills, the tree, the bridge and the fence in the same
   * glance and the meadow is only a strip at the foot of it.
   *
   * So this is deliberately NOT proportional. It is the density the foreground
   * needs to carry a whole viewport on its own.
   */
  drifts: 16,
  perDrift: { min: 5, max: 9 },
  pebbles: { count: 6, from: 195, to: 298 },
  sparkles: { count: 10, from: 164, to: 300 },
};

export const MEADOW_STAGE: Record<Composition, MeadowStage> = {
  landscape: LANDSCAPE_MEADOW,
  portrait: PORTRAIT_MEADOW,
};

/**
 * How much taller things grow toward the left and right edges of the frame.
 *
 * This is the composition wrapping itself around the content. Grass and flowers
 * rise at the sides and stay low through the middle, which arches the
 * foreground around the text the same way the two boughs arch over it. The
 * viewer ends up inside the meadow rather than in front of it, and the middle
 * of the screen — where the book actually is — stays clear.
 */
function edgeBias(x: number, width: number): number {
  const t = Math.abs((x / width) * 2 - 1); // 0 centre, 1 edges
  return 1 + Math.pow(t, 2.2) * 0.85;
}

function makeBlades(rand: Rng, height: number): Blade[] {
  const blades: Blade[] = [];
  // Kept low deliberately. Every tuft is a separately animated group inside one
  // SVG, so the meadow repaints as a whole each frame and its node count is the
  // scene's real performance budget — see the note in Meadow.tsx. Four to six
  // blades reads as a tuft; twelve reads as a tuft and costs three times as
  // much.
  const count = rand.int(4, 6);

  for (let i = 0; i < count; i += 1) {
    const h = rand.mid(height * 0.5, height * 1.35);
    // Blades fan outward from the base and each one leans its own way.
    const lean = rand.around((i - (count - 1) / 2) * 5.5, h * 0.42);
    const curl = rand.around(0.55, 0.22);
    const w = rand.float(0.7, 1.5);

    // Up one edge to the point, back down the other.
    blades.push({
      d:
        `M${-w} 0` +
        ` C${lean * 0.12 - w * 0.7} ${-h * 0.38} ${lean * curl - w * 0.35} ${-h * 0.74} ${lean} ${-h}` +
        ` C${lean * curl + w * 0.35} ${-h * 0.74} ${lean * 0.12 + w * 0.7} ${-h * 0.38} ${w} 0 Z`,
      tipX: lean,
      tipY: -h,
      // A few are seed heads rather than blades.
      seed: rand.chance(0.12),
    });
  }

  return blades;
}

/**
 * One flower, built to its species' own silhouette.
 *
 * Six shapes, not one shape in six colours. A daisy is a ring of narrow petals
 * around a bright heart; a lavender is a spike with no petals at all; clover is
 * a pom. At meadow scale you cannot resolve any of them individually — but you
 * can absolutely tell the difference between a field of six shapes and a field
 * of one, and that difference is most of what makes it read as *wild* flowers.
 *
 * Detail is spent by distance: the far row gets two nodes per flower, the near
 * row gets seven. Detail on something four hundred metres away is detail
 * nobody sees, and it is the whole node budget of the meadow.
 */
function makeFlower(rand: Rng, species: SpeciesName, row: number, scale: number) {
  const parts: FlowerPart[] = [];
  const detail = row; // 0 far, 2 near
  const size = rand.float(2, 3.4);

  const petal = (cx: number, cy: number, r: number, squash = 1) =>
    blobPath(rand, { cx, cy, radius: r, wobble: 0.3, points: 6, squash });

  if (species === "lavender") {
    // A spike: florets up a stem, denser toward the top.
    const beads = detail === 0 ? 3 : detail === 1 ? 5 : 8;
    const rise = rand.float(10, 17);
    for (let i = 0; i < beads; i += 1) {
      const t = i / beads;
      parts.push({
        d: petal(rand.around(0, 1.1), -rise - t * rise * 0.9, size * (0.72 - t * 0.3)),
        heart: false,
      });
    }
    return { parts, height: rise * 2 };
  }

  const height = rand.mid(13, 30);

  if (species === "clover") {
    const beads = detail === 0 ? 2 : detail === 1 ? 4 : 7;
    for (let i = 0; i < beads; i += 1) {
      const a = (i / beads) * Math.PI * 2 + rand.around(0, 0.5);
      const r = size * 0.62;
      parts.push({ d: petal(Math.cos(a) * r, -height + Math.sin(a) * r * 0.8, size * 0.6), heart: false });
    }
    return { parts, height };
  }

  if (detail === 0) {
    // Too far to be anything but a dot of colour.
    parts.push({ d: petal(0, -height, size * 1.15, 0.9), heart: false });
    return { parts, height };
  }

  const petals = species === "daisy" ? rand.int(6, 8) : rand.int(5, 6);
  const reach = size * (species === "daisy" ? 1.5 : 1.2);
  const narrow = species === "daisy" ? 0.44 : 0.86;

  for (let i = 0; i < (detail === 1 ? Math.min(petals, 4) : petals); i += 1) {
    const a = (i / petals) * Math.PI * 2 + rand.around(0, 0.34);
    parts.push({
      d: petal(Math.cos(a) * reach, -height + Math.sin(a) * reach * 0.9, size * narrow, 1.25),
      heart: false,
    });
  }
  parts.push({ d: petal(0, -height, size * 0.52), heart: true });

  return { parts, height: height * scale };
}

/**
 * The whole foreground, generated once.
 *
 * The scatter is deliberately uneven in two different ways: tufts clump and
 * leave bare ground (evenly distributed grass is lawn, and nobody is nostalgic
 * about a lawn), and flowers grow in drifts of a single species seeded from
 * fourteen centres across the field.
 */
export function meadow(
  composition: Composition = DEFAULT_COMPOSITION,
  seed = 20260727,
): Meadow {
  const rand = makeRng(seed);
  const stage = MEADOW_STAGE[composition];
  const width = stage.view.width;
  const result: Meadow = { undergrowth: [], tufts: [], flowers: [], pebbles: [], sparkles: [] };

  // Soft masses under everything — the meadow's own depth, which is what gives
  // the individual blades something to sit against.
  for (let i = 0; i < stage.undergrowth.count; i += 1) {
    result.undergrowth.push(
      blobPath(rand, {
        cx: rand.float(-60, width + 60),
        cy: rand.float(stage.undergrowth.from, stage.undergrowth.to),
        radius: rand.mid(90, 230),
        wobble: 0.34,
        points: rand.int(8, 11),
        squash: rand.float(0.16, 0.3),
      }),
    );
  }

  stage.rows.forEach((row, rowIndex) => {
    let x = rand.float(-40, 20);
    for (let i = 0; i < row.count * 1.15; i += 1) {
      // Clumping: sometimes step barely at all, sometimes leave a gap.
      const step = rand.chance(0.32)
        ? rand.float(8, 26)
        : rand.float((width / row.count) * 0.6, (width / row.count) * 1.45);
      x += step;
      if (x > width + 50) break;

      const bias = edgeBias(x, width);
      result.tufts.push({
        x,
        y: row.y + rand.around(0, 9),
        scale: row.scale * rand.float(0.78, 1.24) * bias,
        row: rowIndex,
        blades: makeBlades(rand, row.height),
        sway: row.sway * rand.float(0.75, 1.3),
        period: rand.float(4.6, 8.2) - rowIndex * 0.4,
        // The breeze crosses left to right in roughly four seconds.
        phase: -((x / width) * 4 + rand.float(0, 1.4)),
      });
    }
  });

  // Fourteen drifts, each one species, each a different size. Two drifts of the
  // same species sometimes land near each other, which is exactly what happens
  // in a field and exactly what you would never do by hand.
  for (let drift = 0; drift < stage.drifts; drift += 1) {
    const species = rand.pick(SPECIES_NAMES);
    // Biased to the two near rows — those are the ones with drawn petals
    // rather than single dots, and on a phone the near row is what fills the
    // very bottom of the frame, where the page actually ends.
    const rowIndex = rand.chance(0.76) ? rand.int(1, 2) : 0;
    const row = stage.rows[rowIndex];
    const centre = rand.float(-40, width + 40);
    const spread = rand.float(60, 200);
    const count = rand.int(stage.perDrift.min, stage.perDrift.max);

    for (let i = 0; i < count; i += 1) {
      const x = centre + rand.around(0, spread);
      const scale = row.scale * rand.float(0.72, 1.2) * edgeBias(x, width);
      const flower = makeFlower(rand, species, rowIndex, scale);
      const lean = rand.around(0, flower.height * 0.22);

      result.flowers.push({
        x,
        y: row.y + rand.around(0, 10),
        scale,
        row: rowIndex,
        species,
        parts: flower.parts,
        stem: `M0 0 C${lean * 0.2} ${-flower.height * 0.45} ${lean * 0.7} ${
          -flower.height * 0.8
        } ${lean} ${-flower.height}`,
        sway: row.sway * rand.float(0.9, 1.5),
        period: rand.float(5.2, 9),
        phase: -((x / width) * 4 + rand.float(0, 1.8)),
      });
    }
  }

  // Stones. Small, few, and half of them catching the light.
  for (let i = 0; i < stage.pebbles.count; i += 1) {
    result.pebbles.push({
      tone: rand.chance(0.4) ? 1 : 0,
      d: blobPath(rand, {
        cx: rand.float(0, width),
        cy: rand.float(stage.pebbles.from, stage.pebbles.to),
        radius: rand.mid(3.5, 11),
        wobble: 0.3,
        points: rand.int(6, 8),
        squash: rand.float(0.45, 0.72),
      }),
    });
  }

  // Points of light on the grass — dew, or the sun off a leaf edge. They
  // twinkle on unrelated periods, so the meadow glitters faintly without ever
  // pulsing.
  for (let i = 0; i < stage.sparkles.count; i += 1) {
    result.sparkles.push({
      x: rand.float(0, width),
      y: rand.float(stage.sparkles.from, stage.sparkles.to),
      r: rand.float(0.9, 2.3),
      period: rand.float(2.6, 7.4),
      phase: -rand.float(0, 7),
    });
  }

  return result;
}

/**
 * Flowers growing along the footpath, in the hills layer rather than the
 * meadow.
 *
 * Wildflowers colonise the edges of a trail because that is where the ground is
 * disturbed and the light gets in — so a path with flowers down both sides is
 * botanically why paths look like that, and emotionally it is an invitation.
 */
export function pathVerge(centre: Point[], scale = 1, seed = 3313) {
  const rand = makeRng(seed);
  return centre.flatMap((point, i) => {
    if (i % 2 !== 0 || i > centre.length - 3) return [];
    const t = i / centre.length;
    const spread = (46 * (1 - t) + 5) * scale;
    return Array.from({ length: rand.int(1, 3) }, () => ({
      x: point.x + (rand.chance(0.5) ? -1 : 1) * rand.float(spread * 0.5, spread * 1.5),
      y: point.y + rand.around(0, 5) * scale,
      r: rand.float(1.4, 3.4) * scale * (1 - t * 0.6),
      species: rand.pick(SPECIES_NAMES),
    }));
  });
}

/**
 * Cherry petals on the way down.
 *
 * Distinct from `motes` below, which rise: pollen hangs on warm air, a petal
 * has weight. The two are also at different depths on purpose — petals fall
 * across the whole frame including in front of the tree, which is where the
 * eye is, so they are the layer doing the most to make the scene feel like it
 * is happening rather than sitting still.
 *
 * Everything here is per-petal and coprime-ish by construction: its own size,
 * fall time, sideways drift, spin, and a negative delay drawn from the whole
 * duration so the sky is already full at first paint rather than filling up
 * over the first half-minute. Nothing about the group can resolve into a
 * rhythm, which is the rule the whole scene is built on.
 *
 * `spin` is signed, so roughly half turn one way. A field of petals all
 * rotating clockwise is the tell that gives away a particle system.
 */
export function petals(seed = 90210, count = 34) {
  const rand = makeRng(seed);
  return Array.from({ length: count }, (_, i) => {
    // A few are close to the viewer and out of focus. Same trick as the motes:
    // a blurred one buys a couple of metres of depth for one CSS property.
    const near = rand.chance(0.28);
    return {
      id: i,
      left: rand.float(-4, 102),
      size: near ? rand.float(7, 11) : rand.float(3.5, 6.5),
      blur: near ? rand.float(1.2, 2.6) : 0,
      // Near petals fall faster, because they are closer. The spread is wide
      // so no two are ever in step.
      duration: near ? rand.float(13, 19) : rand.float(18, 27),
      delay: -rand.float(0, 27),
      drift: rand.around(0, 130),
      spin: (rand.chance(0.5) ? 1 : -1) * rand.float(140, 520),
      opacity: near ? rand.float(0.5, 0.72) : rand.float(0.62, 0.92),
      tone: rand.int(0, 2),
    };
  });
}

/**
 * Pollen, dandelion seed and blossom hanging in the light. Sizes vary a lot on
 * purpose: the big ones are meant to be *out of focus*, close to the viewer,
 * which is a depth cue you get almost for free.
 */
export function motes(seed = 4471, count = 16) {
  const rand = makeRng(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand.float(-2, 100),
    size: rand.mid(2, 9),
    blur: rand.chance(0.35) ? rand.float(1.5, 4) : 0,
    duration: rand.float(34, 78),
    delay: -rand.float(0, 78),
    drift: rand.around(0, 90),
    opacity: rand.float(0.24, 0.62),
  }));
}
