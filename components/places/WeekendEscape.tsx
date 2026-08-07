"use client";

import { useState } from "react";
import { recordPlaceShown } from "@/app/(app)/places/actions";
import { pickPlace } from "@/lib/places/engine";
import { getAllPlaces } from "@/lib/places/source";
import { TRIP_LENGTH_LABELS, TRIP_LENGTH_ORDER } from "@/lib/places/taxonomy";
import type { Month, Place, TripLength } from "@/lib/places/types";
import { PlaceRevealOverlay } from "./PlaceRevealOverlay";

/** "How long do you actually have" — the one question this mode asks before it answers. */
export function WeekendEscape({
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
  const [excluded, setExcluded] = useState<Set<string>>(new Set(recentlyShown));
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [tripLength, setTripLength] = useState<TripLength | null>(null);

  function choose(length: TripLength) {
    setTripLength(length);
    setLoading(true);
    setPlace(null);
    window.setTimeout(() => {
      const picked = pickPlace(getAllPlaces(), { tripLength: length, excludeSlugs: excluded, month });
      if (picked) {
        setExcluded((prev) => new Set(prev).add(picked.slug));
        void recordPlaceShown(picked.slug, "weekend-escape");
      }
      setPlace(picked);
      setLoading(false);
    }, 450);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {TRIP_LENGTH_ORDER.map((length) => (
          <button
            key={length}
            type="button"
            onClick={() => choose(length)}
            className="rounded-full border border-border bg-surface px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-ink transition hover:border-accent hover:text-accent"
          >
            {TRIP_LENGTH_LABELS[length]}
          </button>
        ))}
      </div>

      <PlaceRevealOverlay
        place={place}
        loading={loading}
        loadingLabel="Weighing the options…"
        wishlisted={place ? wishlist.includes(place.slug) : false}
        visited={place ? visited.includes(place.slug) : false}
        onClose={() => {
          setPlace(null);
          setLoading(false);
          setTripLength(null);
        }}
        onAnother={tripLength ? () => choose(tripLength) : undefined}
        anotherLabel="Another idea"
      />
    </div>
  );
}
