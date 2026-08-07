import Link from "next/link";
import type { ReactNode } from "react";
import { HERO_SIZES } from "@/lib/places/images";
import type { Month, Place } from "@/lib/places/types";
import { DiscoveryDoors } from "./DiscoveryDoors";
import { PlaceImageFrame } from "./PlaceImageFrame";
import { SurpriseMe } from "./SurpriseMe";

/**
 * "Where should we travel this weekend?" — the arrival beat, and now **the one
 * place every control lives**.
 *
 * `backdrop` is today's Daily Pick photograph, dimmed under a scrim: it changes
 * once a day (see `dailyPick` in `lib/places/engine.ts`), so the hero never
 * goes stale, and it's *not* named here — the reveal for "today's pick" belongs
 * to the Daily Pick section further down, this is only its light.
 *
 * ## Why everything is in the hero
 *
 * Discovery used to be spread down the page: Surprise Me here, four modes as
 * cards further down, "explore everything" at the very bottom. Which meant the
 * page had three separate places you might act, and the frame — the
 * photograph, the question it asks — was above all of them rather than around
 * them. Gathering the controls onto the backdrop makes the hero a single
 * complete offer: here is the question, and here is every way to answer it.
 *
 * The emphasis order does the work the old vertical distance used to:
 * **Surprise Me** filled and alone (the one primary action), a hairline
 * divider, then the four doors as glass pills, then the browse link as plain
 * underlined text. Three tiers, one screen.
 */
export function PlacesHero({
  backdrop,
  recentlyShown,
  month,
  wishlist,
  visited,
  hiddenGemsRail,
}: {
  backdrop: Place | null;
  recentlyShown: readonly string[];
  month: Month;
  wishlist: readonly string[];
  visited: readonly string[];
  /** Server-rendered; passed straight through to `DiscoveryDoors` — see its prop doc. */
  hiddenGemsRail: ReactNode;
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

        {/*
         * One primary action, alone on its line and the only filled control on
         * the screen. "Let fate decide" is the invitation the page just made,
         * so this is the button that answers it — everything below is an
         * alternative for someone who wants to choose *how* they're surprised.
         */}
        <div className="mt-2">
          <SurpriseMe recentlyShown={recentlyShown} month={month} wishlist={wishlist} visited={visited} />
        </div>

        {/*
         * A hairline rule with a word set into it, rather than a plain "or".
         * The four doors underneath are a genuine step down in emphasis from
         * Surprise Me, and a divider says that in a way that spacing alone
         * doesn't — it reads as a second, quieter offer rather than as five
         * buttons of equal weight, which is what the "one primary next action
         * per section" guardrail is protecting against.
         */}
        <div className="mt-4 flex w-full max-w-sm items-center gap-4" aria-hidden>
          <span className="h-px flex-1 bg-surface/25" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-surface/60">or choose</span>
          <span className="h-px flex-1 bg-surface/25" />
        </div>

        <DiscoveryDoors
          recentlyShown={recentlyShown}
          month={month}
          wishlist={wishlist}
          visited={visited}
          hiddenGemsRail={hiddenGemsRail}
        />

        <Link
          href="/places/browse"
          className="mt-2 text-[11px] uppercase tracking-[0.2em] text-surface/75 underline decoration-surface/40 underline-offset-4 transition hover:text-surface"
        >
          Or explore everything
        </Link>
      </div>
    </section>
  );
}
