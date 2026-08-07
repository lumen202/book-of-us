import { dailyPick } from "@/lib/places/engine";
import { getRecentlyShownSlugs, getSavedSlugs } from "@/lib/places/journal/queries";
import { getAppNow } from "@/lib/relationship/devClock";
import { getAllPlaces, searchPlaces } from "@/lib/places/source";
import { toSummary, type Month } from "@/lib/places/types";
import { LuckyDraw } from "@/components/places/LuckyDraw";
import { PlaceRail } from "@/components/places/PlaceRail";
import { PlaceRevealCard } from "@/components/places/PlaceRevealCard";
import { PlacesHero } from "@/components/places/PlacesHero";
import { SpinWheel } from "@/components/places/SpinWheel";
import { SurpriseMe } from "@/components/places/SurpriseMe";
import { WeekendEscape } from "@/components/places/WeekendEscape";
import { ClosingReflection } from "@/components/story/ClosingReflection";
import { formatMonthDay } from "@/lib/format/date";
import { getDaysUntil, getNextChapterDate } from "@/lib/relationship/nextChapter";
import Link from "next/link";

/**
 * Destination discovery — the whole feature described in
 * `docs/agent/codebase-map/places.md`. A guided sequence of small beats
 * (hero → daily pick → lucky draw → wheel → weekend escape → hidden gems →
 * explore everything), not a dashboard of six buttons at once — see the
 * "reduce simultaneous choices" guardrail in `experience-direction.md`.
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
        <PlacesHero backdrop={today} recentlyShown={recentlyShown} month={month} wishlist={wishlist} visited={visited} />

        {today && (
          <section className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Today&apos;s pick</span>
              <p className="ink-legible max-w-md font-serif text-lg italic text-ink-muted">
                One destination, the same for both of you, until midnight.
              </p>
            </div>
            <PlaceRevealCard place={today} wishlisted={wishlist.includes(today.slug)} visited={visited.includes(today.slug)} />
          </section>
        )}

        <section className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Lucky draw</span>
            <h2 className="ink-legible font-serif text-2xl text-ink">Four cards, face down.</h2>
          </div>
          <LuckyDraw recentlyShown={recentlyShown} month={month} wishlist={wishlist} visited={visited} />
        </section>

        <section id="wheel" className="flex scroll-mt-24 flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Spin the wheel</span>
            <h2 className="ink-legible font-serif text-2xl text-ink">Let the category choose itself.</h2>
          </div>
          <SpinWheel recentlyShown={recentlyShown} month={month} wishlist={wishlist} visited={visited} />
        </section>

        <section className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Weekend escape</span>
            <h2 className="ink-legible font-serif text-2xl text-ink">How long do you actually have?</h2>
          </div>
          <WeekendEscape recentlyShown={recentlyShown} month={month} wishlist={wishlist} visited={visited} />
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Hidden gem mode</span>
            <h2 className="ink-legible font-serif text-2xl text-ink">Nobody else has heard of these.</h2>
          </div>
          <PlaceRail places={hiddenGems} />
          <div className="flex justify-center">
            <SurpriseMe
              recentlyShown={recentlyShown}
              month={month}
              wishlist={wishlist}
              visited={visited}
              hiddenGemOnly
              source="hidden-gem"
              label="Surprise me with a hidden gem"
              loadingLabel="Looking somewhere quieter…"
              className="rounded-full border border-border bg-surface px-7 py-2.5 text-[11px] uppercase tracking-[0.24em] text-ink shadow-[0_8px_16px_-8px_rgba(76,59,48,0.4)] transition hover:border-accent hover:text-accent"
            />
          </div>
        </section>

        <section className="flex flex-col items-center gap-4 text-center">
          <p className="ink-legible max-w-md font-serif text-lg italic text-ink-muted">
            Or skip the fate entirely and look for something in particular.
          </p>
          <Link
            href="/places/browse"
            className="rounded-full bg-accent px-7 py-2.5 text-[11px] uppercase tracking-[0.24em] text-surface shadow-[0_8px_16px_-8px_rgba(76,59,48,0.5)] transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Explore every place
          </Link>
        </section>
      </main>

      <ClosingReflection
        nextChapterLabel={formatMonthDay(nextChapterDate)}
        daysUntilNextChapter={getDaysUntil(nextChapterDate, now)}
      />
    </>
  );
}
