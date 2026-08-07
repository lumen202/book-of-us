"use client";

import Link from "next/link";
import { HERO_SIZES } from "@/lib/places/images";
import { directionsUrl, googleMapsUrl } from "@/lib/places/maps";
import {
  ACTIVITY_LABELS,
  BUDGET_LABELS,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  formatMonthRange,
} from "@/lib/places/taxonomy";
import { estimateTrip } from "@/lib/places/trip";
import type { Place } from "@/lib/places/types";
import { PlaceImageFrame } from "./PlaceImageFrame";
import { RevealCardShell } from "./RevealCardShell";
import { SaveActions } from "./SaveActions";
import { ShareButtons } from "./ShareButtons";

/**
 * The reveal — everything the brief's "Surprise Me" section asks a reveal to
 * show, in one reusable card: Surprise Me, the wheel's result, a flipped
 * Lucky Draw card, Weekend Escape's pick, and Daily Pick all render this same
 * component. One place defines what "here's your destination" looks like,
 * so the five discovery modes read as five doors into the same room rather
 * than five different apps.
 */
export function PlaceRevealCard({
  place,
  wishlisted,
  visited,
  onAnother,
  anotherLabel = "Generate another",
}: {
  place: Place;
  wishlisted: boolean;
  visited: boolean;
  onAnother?: () => void;
  anotherLabel?: string;
}) {
  const trip = estimateTrip(place);

  return (
    <RevealCardShell>
      <div className="flex w-full flex-col items-center gap-6">
      <div className="w-full max-w-sm">
        <PlaceImageFrame
          image={place.heroImage}
          sizes={HERO_SIZES}
          priority
          className="aspect-[4/5] w-full rounded-2xl shadow-[0_20px_40px_-20px_rgba(76,59,48,0.5)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-[0.28em] text-accent">
          {place.category.map((c) => CATEGORY_LABELS[c]).join(" · ")}
        </span>
        <h2 className="font-serif text-3xl leading-tight text-ink">{place.name}</h2>
        <p className="text-sm text-ink-muted">
          {[place.city, place.province].filter(Boolean).join(", ")} · {place.region}
        </p>
      </div>

      <p className="max-w-md font-serif text-lg italic leading-relaxed text-ink-muted">{place.note}</p>

      <dl className="grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-3 text-left text-xs">
        <div>
          <dt className="uppercase tracking-[0.18em] text-ink-muted">Best months</dt>
          <dd className="mt-0.5 text-ink">{formatMonthRange(place.bestMonths)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-ink-muted">Budget</dt>
          <dd className="mt-0.5 text-ink">{BUDGET_LABELS[place.budget]}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-ink-muted">Effort</dt>
          <dd className="mt-0.5 text-ink">{DIFFICULTY_LABELS[place.difficulty]}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-ink-muted">From {trip.label === "practically next door" ? "Cebu" : "here"}</dt>
          <dd className="mt-0.5 text-ink">{trip.label}</dd>
        </div>
      </dl>

      {place.activities.length > 0 && (
        <p className="max-w-sm text-xs text-ink-muted">
          {place.activities.slice(0, 5).map((a) => ACTIVITY_LABELS[a]).join(" · ")}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={googleMapsUrl(place)}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-full border border-border bg-surface px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-ink transition hover:border-accent hover:text-accent"
        >
          Open in Maps
        </a>
        <a
          href={directionsUrl(place)}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-full border border-border bg-surface px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-ink transition hover:border-accent hover:text-accent"
        >
          Directions
        </a>
        <Link
          href={`/places/${place.slug}`}
          className="rounded-full border border-border bg-surface px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-ink transition hover:border-accent hover:text-accent"
        >
          The whole page
        </Link>
      </div>

      <SaveActions slug={place.slug} initialWishlisted={wishlisted} initialVisited={visited} />
      <ShareButtons path={`/places/${place.slug}`} title={place.name} />

      {onAnother && (
        <button
          type="button"
          onClick={onAnother}
          className="mt-2 rounded-full bg-accent px-7 py-2.5 text-[11px] uppercase tracking-[0.24em] text-surface shadow-[0_8px_16px_-8px_rgba(76,59,48,0.5)] transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {anotherLabel}
        </button>
      )}
      </div>
    </RevealCardShell>
  );
}
