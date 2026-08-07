import type { PlaceSummary } from "@/lib/places/types";
import { PlaceCard } from "./PlaceCard";

/** A horizontal scroll of destinations — Hidden Gems, Recently Viewed, related places on the detail page. */
export function PlaceRail({ places }: { places: readonly PlaceSummary[] }) {
  if (places.length === 0) return null;
  return (
    <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2">
      {places.map((place, index) => (
        <div key={place.id} className="w-[260px] shrink-0 snap-start sm:w-[280px]">
          <PlaceCard place={place} index={index} />
        </div>
      ))}
    </div>
  );
}
