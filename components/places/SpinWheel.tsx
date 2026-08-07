"use client";

import { useMemo, useState } from "react";
import { recordPlaceShown } from "@/app/(app)/places/actions";
import { pickPlace } from "@/lib/places/engine";
import { getAllPlaces } from "@/lib/places/source";
import { WHEEL_LABELS } from "@/lib/places/taxonomy";
import type { Month, Place } from "@/lib/places/types";
import { buildWheelSegments, computeSpinRotation, spinToCategory, type WheelSegment } from "@/lib/places/wheel";
import { PlaceRevealOverlay } from "./PlaceRevealOverlay";

const RADIUS = 140;
const CENTER = 150;
const SIZE = 300;
const HUB_RADIUS = 20;
/**
 * Where every wedge's label is *centred*, as a fraction of RADIUS.
 *
 * One shared radius with `textAnchor="middle"`, rather than anchoring each
 * label at one end: the labels then form an even ring at a constant distance
 * from the hub, and the two halves of the wheel mirror each other exactly.
 * Anchoring from the ends (`start` at a small radius for one half, `start` at
 * a large radius for the flipped half) put the right half's text bunched near
 * the hub and the left half's out by the rim — a visible asymmetry, since a
 * label's own length then decided how far across its wedge it reached.
 */
const LABEL_RADIUS_FRACTION = 0.56;

/** Point on the wheel's circle for a given angle (0 = 12 o'clock, clockwise) and radius fraction. */
function pointAt(deg: number, radiusFraction: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const r = RADIUS * radiusFraction;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function wedgePath(segment: WheelSegment): string {
  const p1 = pointAt(segment.startDeg, 1);
  const p2 = pointAt(segment.endDeg, 1);
  const largeArc = segment.endDeg - segment.startDeg > 180 ? 1 : 0;
  return `M${CENTER},${CENTER} L${p1.x},${p1.y} A${RADIUS},${RADIUS} 0 ${largeArc} 1 ${p2.x},${p2.y} Z`;
}

/**
 * Straight, radial (spoke-style) labels — laid out along each wedge's own
 * radius, the way hour marks radiate from a clock's centre.
 *
 * Two other orientations were tried and dropped first: text rotated to point
 * straight at the centre, and text curved along the rim (`textPath`). Both
 * run *tangentially* — along the wheel's circumference — and with 20 wedges
 * at 18° each, that direction only ever has a few dozen pixels before
 * crowding into the next wedge, no matter the font size. The radial
 * direction has no such ceiling: a label gets the whole hub-to-rim distance
 * (~100px), because a wedge's angular width barely constrains text laid out
 * *along* the radius — only the letters' height has to fit inside 18°, not
 * their length.
 *
 * The rotation: SVG's unrotated text reads along +x, so rotating by
 * `midDeg - 90` aligns its reading direction with the outward radial vector
 * (matching `pointAt`'s own `(deg - 90)` convention). That is a rigid
 * rotation and never mirrors a glyph — but on the wheel's left half it lands
 * past 90° from horizontal, which for a *word* reads as upside-down even
 * though no individual letter is flipped. So past that threshold, add 180°:
 * the label then reads inward rather than outward, staying upright the whole
 * way round the wheel.
 *
 * Both halves share one centred anchor (see `LABEL_RADIUS_FRACTION`), so the
 * flip changes only reading direction, never where the label sits.
 */
function labelTransform(segment: WheelSegment): { x: number; y: number; rotate: number } {
  const outward = segment.midDeg - 90;
  const normalized = ((outward % 360) + 360) % 360;
  const upsideDown = normalized > 90 && normalized < 270;
  const anchor = pointAt(segment.midDeg, LABEL_RADIUS_FRACTION);
  return { x: anchor.x, y: anchor.y, rotate: upsideDown ? outward + 180 : outward };
}

/** Two alternating tones, both from `baseTokens` — see `theming.md`: UI stays off the garden palette. */
function wedgeFill(index: number): string {
  return index % 2 === 0
    ? "color-mix(in srgb, var(--color-accent) 30%, var(--color-surface))"
    : "color-mix(in srgb, var(--color-accent-warm) 24%, var(--color-surface))";
}

export function SpinWheel({
  recentlyShown,
  month,
  wishlist,
  visited,
}: {
  recentlyShown: readonly string[];
  month: Month;
  wishlist: readonly string[];
  visited: readonly string[];
}) {
  const segments = useMemo(() => buildWheelSegments(getAllPlaces()), []);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landedLabel, setLandedLabel] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set(recentlyShown));
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setLandedLabel(null);
    setPlace(null);

    const segment = spinToCategory(segments);
    const nextRotation = computeSpinRotation(segment, rotation);
    setRotation(nextRotation);

    window.setTimeout(() => {
      setSpinning(false);
      setLandedLabel(segment.label);
      setLoading(true);
      window.setTimeout(() => {
        const picked = pickPlace(getAllPlaces(), {
          category: segment.category,
          excludeSlugs: excluded,
          month,
        });
        if (picked) {
          setExcluded((prev) => new Set(prev).add(picked.slug));
          void recordPlaceShown(picked.slug, "wheel");
        }
        setPlace(picked);
        setLoading(false);
      }, 500);
    }, 3200);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/*
       * `min(88vw, …)` rather than a flat pixel width — the wheel used to be
       * a fixed 280px regardless of device, which left a lot of unused width
       * on an actual phone (this app's primary surface) sitting either side
       * of it. Scaling against the viewport means it actually fills most of
       * a phone's width the way the hand-drawn wheel-of-fortune framing
       * implies it should, while `sm:w-[380px]` still caps it to something
       * sane once there's a full desktop column to sit in.
       */}
      <div className="relative aspect-square w-[min(88vw,360px)] sm:w-[380px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full overflow-visible motion-reduce:transition-none"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 3.2s cubic-bezier(0.17, 0.87, 0.32, 1)" : undefined,
          }}
          role="img"
          aria-label="A wheel of destination categories"
        >
          {/*
           * The pointer lives *inside* the svg viewBox — a sibling HTML div
           * pinned to the wrapper's top edge looked right at one size and
           * drifted at every other, because it didn't scale with the wheel's
           * own responsive width the way everything drawn in the viewBox
           * does automatically.
           */}
          <path
            d={`M${CENTER - 10},${2} L${CENTER + 10},${2} L${CENTER},${20} Z`}
            fill="var(--color-accent-warm)"
            style={{ filter: "drop-shadow(0 2px 3px rgba(76,59,48,0.4))" }}
          />
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 4} fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={2} />
          {segments.map((segment, index) => {
            const label = labelTransform(segment);
            return (
              <g key={segment.category}>
                <path
                  d={wedgePath(segment)}
                  fill={wedgeFill(index)}
                  stroke="var(--color-surface)"
                  strokeWidth={1.5}
                />
                <text
                  x={label.x}
                  y={label.y}
                  fontSize={11}
                  fill="var(--color-ink)"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${label.rotate}, ${label.x}, ${label.y})`}
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {WHEEL_LABELS[segment.category]}
                </text>
              </g>
            );
          })}
          <circle cx={CENTER} cy={CENTER} r={HUB_RADIUS} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={3} />
        </svg>
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="rounded-full border border-border bg-surface px-7 py-2.5 text-[11px] uppercase tracking-[0.24em] text-ink shadow-[0_8px_16px_-8px_rgba(76,59,48,0.4)] transition hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {spinning ? "Spinning…" : "Spin the wheel"}
      </button>

      {landedLabel && !place && !loading && (
        <p className="font-serif text-lg italic text-ink-muted">Landed on {landedLabel.toLowerCase()}.</p>
      )}

      <PlaceRevealOverlay
        place={place}
        loading={loading}
        loadingLabel={landedLabel ? `Finding one in ${landedLabel.toLowerCase()}…` : "Finding one…"}
        wishlisted={place ? wishlist.includes(place.slug) : false}
        visited={place ? visited.includes(place.slug) : false}
        onClose={() => {
          setPlace(null);
          setLoading(false);
          setLandedLabel(null);
        }}
        onAnother={spin}
        anotherLabel="Spin again"
      />
    </div>
  );
}
