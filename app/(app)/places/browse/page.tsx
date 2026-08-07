import Link from "next/link";
import { PlacesBrowser } from "@/components/places/PlacesBrowser";
import { ClosingReflection } from "@/components/story/ClosingReflection";
import { formatMonthDay } from "@/lib/format/date";
import { getAppNow } from "@/lib/relationship/devClock";
import { getDaysUntil, getNextChapterDate } from "@/lib/relationship/nextChapter";

export default async function PlacesBrowsePage() {
  const now = getAppNow();
  const nextChapterDate = getNextChapterDate(now);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 pt-8">
        <Link
          href="/places"
          className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
        >
          &larr; Back to discovery
        </Link>

        <section className="flex max-w-2xl flex-col gap-3">
          <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Every place in the book</span>
          <h1 className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Looking for somewhere in particular?
          </h1>
        </section>

        <PlacesBrowser />
      </main>

      <ClosingReflection
        nextChapterLabel={formatMonthDay(nextChapterDate)}
        daysUntilNextChapter={getDaysUntil(nextChapterDate, now)}
      />
    </>
  );
}
