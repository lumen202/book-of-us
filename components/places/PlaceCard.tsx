import Link from "next/link";
import { CARD_SIZES } from "@/lib/places/images";
import { CATEGORY_LABELS, formatMonthRange } from "@/lib/places/taxonomy";
import type { PlaceSummary } from "@/lib/places/types";
import { PlaceImageFrame } from "./PlaceImageFrame";

/**
 * One destination in a grid or a horizontal rail. Deliberately no coloured
 * category badge — `docs/agent/codebase-map/bucket-list.md`'s
 * `CategoryFilterRow` note explains why: a row of coloured pill chips reads
 * as a dashboard filter bar (see `BUG-004`), the exact register this feature
 * is trying to stay out of. Category shows as plain small-caps text instead,
 * the same language `ChapterCover` uses for its month label.
 */
export function PlaceCard({
  place,
  index = 0,
  priority = false,
}: {
  place: PlaceSummary;
  index?: number;
  priority?: boolean;
}) {
  const tiltClass = index % 2 === 0 ? "sm:rotate-[-0.35deg]" : "sm:rotate-[0.35deg]";
  const primaryCategory = place.category[0];

  return (
    <Link
      href={`/places/${place.slug}`}
      className={`scene-card group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-surface/70 shadow-[0_14px_34px_-26px_rgba(43,36,28,0.35)] transition duration-500 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_18px_40px_-24px_rgba(43,36,28,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${tiltClass}`}
    >
      <PlaceImageFrame image={place.heroImage} sizes={CARD_SIZES} priority={priority} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-1.5 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.22em] text-accent">
            {primaryCategory ? CATEGORY_LABELS[primaryCategory] : ""}
          </span>
          {place.hiddenGem && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Hidden gem</span>
          )}
        </div>
        <h3 className="font-serif text-xl leading-snug text-ink transition group-hover:text-accent">
          {place.name}
        </h3>
        <p className="text-xs text-ink-muted">
          {place.province} · {formatMonthRange(place.bestMonths)}
        </p>
      </div>
    </Link>
  );
}
