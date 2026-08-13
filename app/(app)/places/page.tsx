import { dailyPick } from "@/lib/places/engine";
import { getRecentlyShownSlugs, getSavedSlugs } from "@/lib/places/journal/queries";
import { getAppNow } from "@/lib/relationship/devClock";
import { getAllPlaces, searchPlaces } from "@/lib/places/source";
import { toSummary, type Month } from "@/lib/places/types";
import { PlaceRail } from "@/components/places/PlaceRail";
import { PlaceRevealCard } from "@/components/places/PlaceRevealCard";
import { PlacesHero } from "@/components/places/PlacesHero";
import { ClosingReflection } from "@/components/story/ClosingReflection";
import { formatMonthDay } from "@/lib/format/date";
import { getDaysUntil, getNextChapterDate } from "@/lib/relationship/nextChapter";

/**
 * Destination discovery — the whole feature described in
 * `docs/agent/codebase-map/places.md`.
 *
 * Three beats, in order: **arrive** (the hero), **be given one thing** (today's
 * pick, no choice to make), then **choose a way in** (the doors). Everything
 * past the doors opens into `DiscoveryLayer` rather than continuing down the
 * page.
 *
 * This page used to stack all five modes vertically, which made "spin the
 * wheel" a scroll target below three other games and mounted every one of them
 * on arrival. The sequence was real but nobody experienced it as one — a long
 * page reads as a list of everything available, not as a progression. See
 * `DiscoveryDoors` for the presentation and `DiscoveryLayer` for why the modes
 * open in a layer rather than at their own routes.
 */
export default async function PlacesPage() {
  const now = getAppNow();
  const month = (now.getMonth() + 1) as Month;
  const places = getAllPlaces();

  const [recentlyShownSet, wishlistSet, visitedSet] = await Promise.all([
    getRecentlyShownSlugs(),
    getSavedSlugs("wishlist"),
    getSavedSlugs("visited"),
  ]);
  const recentlyShown = Array.from(recentlyShownSet);
  const wishlist = Array.from(wishlistSet);
  const visited = Array.from(visitedSet);

  const today = dailyPick(places, now);
  const hiddenGems = searchPlaces({ hiddenGemOnly: true }).map(toSummary);
  const nextChapterDate = getNextChapterDate(now);

  return (
    <>
      {/*
       * `.ink-legible` is applied per element below, deliberately NOT here
       * on `<main>`. It works by `text-shadow`, which *inherits* — putting
       * it on the wrapper pushed a halo onto every descendant, including
       * type sitting on real `bg-surface` cards (the Daily Pick reveal, the
       * flipped Lucky Draw cards), where there's nothing to compensate for
       * and the halo just reads as blur. It belongs only on text with the
       * painted backdrop directly behind it.
       */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-24 px-6 pt-8">
        <PlacesHero
          backdrop={today}
          recentlyShown={recentlyShown}
          month={month}
          wishlist={wishlist}
          visited={visited}
          hiddenGemsRail={<PlaceRail places={hiddenGems} />}
        />

        {today && (
          <section className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="ink-legible ink-legible-label text-[11px] uppercase tracking-[0.3em] text-accent">Today&apos;s pick</span>
              <p className="ink-legible ink-legible-label max-w-md font-serif text-lg italic text-ink-muted">
                One destination, the same for both of you, until midnight.
              </p>
            </div>
            <PlaceRevealCard place={today} wishlisted={wishlist.includes(today.slug)} visited={visited.includes(today.slug)} />
          </section>
        )}

        {/*
         * Nothing after the daily pick. The "ways in" section and the closing
         * "explore every place" section both moved into `PlacesHero`, which is
         * now the only place on this page you act — so what remains below the
         * hero is the one thing the book *gives* you rather than asks of you,
         * and then the reflection. Anything more here would be a second menu
         * under a page that already has one.
         */}
      </main>

      <ClosingReflection
        nextChapterLabel={formatMonthDay(nextChapterDate)}
        daysUntilNextChapter={getDaysUntil(nextChapterDate, now)}
      />
    </>
  );
}
