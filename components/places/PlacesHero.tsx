import Link from "next/link";
import { HERO_SIZES } from "@/lib/places/images";
import type { Month, Place } from "@/lib/places/types";
import { PlaceImageFrame } from "./PlaceImageFrame";
import { SurpriseMe } from "./SurpriseMe";

/**
 * "Where should we travel this weekend?" — the arrival beat, matching the
 * brief's mock almost verbatim. `backdrop` is today's Daily Pick photograph,
 * dimmed under a scrim: it changes once a day (see `dailyPick` in
 * `lib/places/engine.ts`), so the hero never goes stale, and it's *not* named
 * here — the reveal for "today's pick" belongs to the Daily Pick section
 * further down, this is only its light.
 */
export function PlacesHero({
  backdrop,
  recentlyShown,
  month,
  wishlist,
  visited,
}: {
  backdrop: Place | null;
  recentlyShown: readonly string[];
  month: Month;
  wishlist: readonly string[];
  visited: readonly string[];
}) {
  return (
    // Framed the same way at every size — rounded corners and the ambient
    // backdrop showing past its edges, not just above `sm`. It used to go
    // edge-to-edge on mobile (`-mx-6`, no rounding), on the assumption that
    // was the "full-bleed hero" idiom; side by side with the desktop
    // version it read as a missing frame rather than an intentional one.
    <section className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]">
      <div className="absolute inset-0">
        {backdrop && (
          <PlaceImageFrame image={backdrop.heroImage} sizes={HERO_SIZES} priority className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/45 to-ink/20" />
      </div>

      <div className="relative flex flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
        <span className="text-[11px] uppercase tracking-[0.32em] text-surface/80">Places</span>
        <h1 className="max-w-xl font-serif text-4xl leading-tight text-surface sm:text-5xl">
          Discover your next adventure.
        </h1>
        <p className="max-w-md font-serif text-lg italic text-surface/85">
          Not sure where to travel? Let fate decide.
        </p>

        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <SurpriseMe recentlyShown={recentlyShown} month={month} wishlist={wishlist} visited={visited} />
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-surface/60 sm:inline">or</span>
          <Link
            href="#wheel"
            className="rounded-full border border-surface/50 bg-surface/10 px-8 py-3.5 text-[12px] uppercase tracking-[0.26em] text-surface backdrop-blur-sm transition hover:bg-surface/20"
          >
            Spin the Wheel
          </Link>
        </div>

        <Link
          href="/places/browse"
          className="text-[11px] uppercase tracking-[0.2em] text-surface/75 underline decoration-surface/40 underline-offset-4 transition hover:text-surface"
        >
          Or explore everything
        </Link>
      </div>
    </section>
  );
}
