/**
 * Chapters are created on the 1st of every month (`lib/chapters/mutations.ts`
 * + the cron route that calls it), so there's somewhere to add a photo all
 * month long. Celebration Mode is the separate ceremony on the 5th — see
 * `lib/celebration/isCelebrationDay.ts` — and does not gate chapter creation
 * or reveal any more. These are pure calendar helpers so the "what's next"
 * copy at the end of a visit never has to be hand-written or hard-coded into
 * a page.
 */

const CHAPTER_DAY = 1;

/**
 * The next date a chapter arrives, at local midnight. On the 1st itself this
 * returns *today* rather than skipping a month ahead — the chapter has just
 * landed, and telling her it's a month away would be a lie on the one day it
 * matters most.
 */
export function getNextChapterDate(from: Date = new Date()): Date {
  const next = new Date(from.getFullYear(), from.getMonth(), CHAPTER_DAY);
  if (from.getDate() > CHAPTER_DAY) next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * The next monthsary — the 5th, the same day `isCelebrationDay` keys off.
 *
 * This is what the closing reflection counts toward now, not the chapter
 * drop: the 1st is when the *container* appears, which is plumbing, but the
 * 5th is the date that belongs to the two of them. Same today-not-next-month
 * rule as above, for the same reason.
 */
const MONTHSARY_DAY = 5;

export function getNextMonthsaryDate(from: Date = new Date()): Date {
  const next = new Date(from.getFullYear(), from.getMonth(), MONTHSARY_DAY);
  if (from.getDate() > MONTHSARY_DAY) next.setMonth(next.getMonth() + 1);
  return next;
}

/** Whole days from `from` until `target`, counted in calendar days, never negative. */
export function getDaysUntil(target: Date, from: Date = new Date()): number {
  const startOfFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((target.getTime() - startOfFrom.getTime()) / msPerDay));
}
