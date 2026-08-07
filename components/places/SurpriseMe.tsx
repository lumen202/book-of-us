"use client";

import { useState } from "react";
import { recordPlaceShown } from "@/app/(app)/places/actions";
import { pickPlace } from "@/lib/places/engine";
import { getAllPlaces } from "@/lib/places/source";
import type { Month, Place } from "@/lib/places/types";
import type { PlaceShownSource } from "@/lib/places/journal/types";
import { PlaceRevealOverlay } from "./PlaceRevealOverlay";

/**
 * The headline CTA — and, with `hiddenGemOnly`, also Hidden Gem Mode. Same
 * mechanic (pick, reveal, remember what's been shown), so this doubles as
 * both rather than existing as two near-identical components. Picks via
 * `lib/places/engine.ts`'s `pickPlace`, which favours whatever this visitor
 * hasn't been shown recently — see `recentlyShown` below, fetched once
 * server-side in `app/(app)/places/page.tsx` so the very first tap already
 * knows the visit's history, not just picks made later in this session.
 */
export function SurpriseMe({
  recentlyShown,
  month,
  wishlist,
  visited,
  hiddenGemOnly = false,
  source = "surprise",
  label = "Surprise Me",
  loadingLabel = "Turning the page…",
  className,
}: {
  recentlyShown: readonly string[];
  month: Month;
  wishlist: readonly string[];
  visited: readonly string[];
  hiddenGemOnly?: boolean;
  source?: PlaceShownSource;
  label?: string;
  loadingLabel?: string;
  className?: string;
}) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set(recentlyShown));
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);

  function reveal() {
    const places = getAllPlaces();
    setLoading(true);
    setPlace(null);
    window.setTimeout(
      () => {
        const picked = pickPlace(places, { excludeSlugs: excluded, month, hiddenGemOnly });
        if (picked) {
          setExcluded((prev) => new Set(prev).add(picked.slug));
          void recordPlaceShown(picked.slug, source);
        }
        setPlace(picked);
        setLoading(false);
      },
      // A beat of anticipation, not a real wait — see the "reveal should feel
      // rewarding" note in docs/agent/codebase-map/places.md. Skipped when the
      // page has no images to preload against (nothing to actually wait on).
      550,
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={reveal}
        className={
          className ??
          "rounded-full bg-accent px-8 py-3.5 text-[12px] uppercase tracking-[0.26em] text-surface shadow-[0_10px_20px_-10px_rgba(76,59,48,0.55)] transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        }
      >
        {label}
      </button>
      <PlaceRevealOverlay
        place={place}
        loading={loading}
        loadingLabel={loadingLabel}
        wishlisted={place ? wishlist.includes(place.slug) : false}
        visited={place ? visited.includes(place.slug) : false}
        onClose={() => {
          setPlace(null);
          setLoading(false);
        }}
        onAnother={reveal}
      />
    </>
  );
}
