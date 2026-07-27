import { HomeCover } from "@/components/home/HomeCover";
import { ChapterCover } from "@/components/chapter/ChapterCover";
import { listChapters } from "@/lib/chapters/queries";
import { getRelationship } from "@/lib/relationship/queries";
import { getMonthsaryNumber } from "@/lib/relationship/monthsary";
import { pickMonthsaryMessage } from "@/lib/celebration/messages";
import { formatMonthDay, toLocalDate } from "@/lib/format/date";
import { ordinal } from "@/lib/format/ordinal";
import { getAppNow } from "@/lib/relationship/devClock";
import { getDaysUntil, getNextChapterDate } from "@/lib/relationship/nextChapter";
import { ClosingReflection } from "@/components/story/ClosingReflection";

export default async function HomePage() {
  const [chapters, relationship] = await Promise.all([listChapters(), getRelationship()]);
  const subtitle = relationship
    ? `${relationship.partner_a_name} & ${relationship.partner_b_name}`
    : undefined;

  // `getAppNow()` is the real clock in production and everywhere except local
  // dev before the first monthsary — see lib/relationship/devClock.ts. Used
  // here (rather than each call defaulting to `new Date()`) so this number,
  // the "next chapter" countdown below, and the shelf's unlocked-chapter
  // count from `listChapters()` all agree on what day it is.
  const now = getAppNow();

  // Clamped to at least 1: the real 1st monthsary isn't until a full month
  // has elapsed, but Celebration Mode (via the dev preview toggle) can be
  // forced on before then, and "Happy 0th Monthsary" would be a broken-
  // looking thing to show — the clamp only ever matters in that narrow
  // first-month window.
  const monthsaryNumber = relationship
    ? Math.max(1, getMonthsaryNumber(toLocalDate(relationship.started_at), now))
    : null;
  const celebrationLabel =
    monthsaryNumber !== null ? `Happy ${ordinal(monthsaryNumber)} Monthsary` : undefined;
  const celebrationMessage = celebrationLabel ? pickMonthsaryMessage() : undefined;
  const nextChapterDate = getNextChapterDate(now);

  return (
    <HomeCover
      title="The Book of Us"
      subtitle={subtitle}
      celebrationLabel={celebrationLabel}
      celebrationMessage={celebrationMessage}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-6 pb-6 pt-8">
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="ink-legible text-[11px] uppercase tracking-[0.32em] text-accent">
            Open gently
          </span>
          <p className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Some days are big enough to deserve a chapter.
          </p>
          <p className="ink-legible max-w-xl text-base text-ink sm:text-lg">
            Move slowly. Pick a month. Let a memory arrive before you ask it to.
          </p>
        </section>

        <section className="mx-auto w-full max-w-3xl">
          <h1 className="ink-legible mb-6 font-serif text-3xl text-ink">Chapters</h1>
        {chapters.length === 0 ? (
            <p className="ink-legible max-w-xl text-ink">
              The first chapter has not been written yet. When it appears, this shelf will remember
              exactly where it belongs.
            </p>
        ) : (
            <ol className="flex flex-col gap-5">
              {chapters.map((chapter, index) => (
                <li key={chapter.id}>
                  <ChapterCover chapter={chapter} index={index} />
                </li>
              ))}
            </ol>
        )}
        </section>
      </main>

      <ClosingReflection
        nextChapterLabel={formatMonthDay(nextChapterDate)}
        daysUntilNextChapter={getDaysUntil(nextChapterDate, now)}
      />
    </HomeCover>
  );
}
