import { HomeCover } from "@/components/home/HomeCover";
import { ChapterCover } from "@/components/chapter/ChapterCover";
import { listChapters } from "@/lib/chapters/queries";
import { isCelebrationDay } from "@/lib/celebration/isCelebrationDay";
import { findLookBackPrints } from "@/lib/memories/queries";
import {
  getLoveLetter,
  getMyLoveLetterDraft,
  getMyWhisperDraft,
  getRelationship,
  getWhisperLines,
} from "@/lib/relationship/queries";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { getMonthsaryNumber } from "@/lib/relationship/monthsary";
import { pickMonthsaryMessage } from "@/lib/celebration/messages";
import { formatMonthDay, toLocalDate } from "@/lib/format/date";
import { ordinal } from "@/lib/format/ordinal";
import { getAppNow } from "@/lib/relationship/devClock";
import { getDaysUntil, getNextMonthsaryDate } from "@/lib/relationship/nextChapter";
import { shouldRollSurprise } from "@/lib/surprises/pick";
import { getSurpriseCandidate } from "@/lib/surprises/queries";
import { ClosingReflection } from "@/components/story/ClosingReflection";
import { SurprisePrint } from "@/components/surprises/SurprisePrint";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ celebrate?: string; previewAsPartner?: string }>;
}) {
  const [chapters, relationship, isKeeper, params] = await Promise.all([
    listChapters(),
    getRelationship(),
    isCurrentUserAdmin(),
    searchParams,
  ]);
  const subtitle = relationship
    ? `${relationship.partner_a_name} & ${relationship.partner_b_name}`
    : undefined;

  /**
   * A letter/whisper is written *for* a partner, not shared — so on an ordinary visit this shows
   * what the *other* account saved (`getLoveLetter`/`getWhisperLines`). The keeper-only "Preview
   * partner's ceremony" button (`CelebrationControls.tsx`) instead asks for the current viewer's
   * own draft (`getMy…Draft`) via `?previewAsPartner=1`, so they can check what they wrote before
   * their partner ever sees it — without that flag, there's no way to preview your own outgoing
   * letter, since it deliberately never shows on your own real ceremony.
   */
  const previewAsPartner = params.previewAsPartner === "1";
  const loveLetter = previewAsPartner
    ? getMyLoveLetterDraft(relationship, isKeeper)
    : getLoveLetter(relationship, isKeeper);
  const whisperLines = previewAsPartner
    ? getMyWhisperDraft(relationship, isKeeper)
    : getWhisperLines(relationship, isKeeper);

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
  const celebrationMessage = celebrationLabel
    ? pickMonthsaryMessage(monthsaryNumber ?? undefined)
    : undefined;
  const nextMonthsaryDate = getNextMonthsaryDate(now);

  /**
   * Last month's photographs, for the ceremony's look back (never the current
   * calendar month's on a *real* celebration — see `findLookBackPrints` for
   * why that chapter is excluded even though it's already on the shelf by the
   * 5th). Previewing is the deliberate exception: `excludeCurrentMonth: false`
   * below, because the preview button is used *before* a real "last month"
   * exists — the whole point is seeing photos just added to the current,
   * in-progress month, not last month's.
   *
   * Not fetched on every visit: it costs a signed Storage URL per print, and 29
   * days in 30 nobody will see them. So it is gated on the same question the
   * ceremony itself is gated on — but asked *server-side*, which is the part
   * that needs care.
   *
   * `useCelebrating()` (client) answers from `isCelebrationDay()` **or** a dev
   * override that lives in a query param and localStorage. The server can see
   * `?celebrate=1` but not localStorage, so the two can disagree — and when
   * they did, the whole preview path was broken in a way that looked like the
   * feature was missing: `?celebrate=1` played the ceremony, the server had
   * said "not the 5th" and sent no prints, and the look-back beat skipped
   * itself silently. Reading the query param here is what keeps a preview
   * honest. A localStorage-only override still gets an empty look back; use the
   * query param — or the admin's "Play the ceremony" button, which navigates
   * with it — to see this beat.
   *
   * `listChapters()` is newest-first, which is the order `findLookBackPrints`
   * needs.
   */
  const previewing = params.celebrate === "1";
  const monthPrints =
    isCelebrationDay(now) || previewing
      ? await findLookBackPrints(chapters, undefined, { excludeCurrentMonth: !previewing })
      : [];

  /**
   * The "on this day / from the book" beat — see `lib/surprises/`. Never on
   * a Celebration day (that already has its own look-back beat) or while
   * previewing one, and only ~1 visit in 3 even then: unpredictability is
   * the point, and a surprise that shows up every visit is just a widget.
   * `getSurpriseCandidate` itself returns `null` below the archive-size floor
   * or when every eligible memory is in cooldown, so this can still be `null`
   * even when the coin flip says yes.
   */
  const showSurprise = !isCelebrationDay(now) && !previewing && shouldRollSurprise();
  const surprise = showSurprise ? await getSurpriseCandidate(isKeeper) : null;

  return (
    <HomeCover
      title="The Book of Us"
      subtitle={subtitle}
      celebrationLabel={celebrationLabel}
      celebrationMessage={celebrationMessage}
      monthsaryNumber={monthsaryNumber ?? undefined}
      monthPrints={monthPrints}
      letter={loveLetter ?? undefined}
      whisperLines={whisperLines ?? undefined}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-6 pb-6 pt-8">
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="ink-legible ink-legible-label text-[11px] uppercase tracking-[0.32em] text-accent">
            Open gently
          </span>
          <p className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">
            We kept everything.
          </p>
          <p className="ink-legible max-w-xl text-base text-ink sm:text-lg">
            Pick a month and see.
          </p>
        </section>

        {surprise && (
          <SurprisePrint
            memory={surprise.memory}
            chapterSlug={surprise.chapterSlug}
            thumbnailUrl={surprise.thumbnailUrl}
          />
        )}

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
        nextMonthsaryLabel={formatMonthDay(nextMonthsaryDate)}
        daysUntilNextMonthsary={getDaysUntil(nextMonthsaryDate, now)}
      />
    </HomeCover>
  );
}
