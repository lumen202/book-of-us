/**
 * Chapters arrive on the 5th of every month. These are pure calendar helpers
 * so the "what's next" copy at the end of a visit never has to be hand-written
 * or hard-coded into a page.
 */

const CHAPTER_DAY = 5;

/**
 * The next date a chapter arrives, at local midnight. On the 5th itself this
 * returns *today* rather than skipping a month ahead — the chapter has just
 * landed, and telling her it's a month away would be a lie on the one day it
 * matters most.
 */
export function getNextChapterDate(from: Date = new Date()): Date {
  const next = new Date(from.getFullYear(), from.getMonth(), CHAPTER_DAY);
  if (from.getDate() > CHAPTER_DAY) next.setMonth(next.getMonth() + 1);
  return next;
}

/** Whole days from `from` until `target`, counted in calendar days, never negative. */
export function getDaysUntil(target: Date, from: Date = new Date()): number {
  const startOfFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((target.getTime() - startOfFrom.getTime()) / msPerDay));
}

/**
 * How many monthsaries have actually elapsed since `startDate`, as of `now` —
 * safe to call on *any* day, unlike `getMonthsaryNumber` in `monthsary.ts`.
 *
 * That function is a raw year/month subtraction and says so in its own
 * comment: it's only correct when called on the 5th, because it doesn't look
 * at day-of-month at all. This one does — it holds the current calendar
 * month back until its own 5th has actually passed — which is what makes it
 * safe to use for gating content on every day of the month, not just the 5th.
 *
 * Used by `lib/chapters/queries.ts` to decide how many chapters have
 * unlocked: not by comparing a chapter's own `month` field to today (a
 * chapter can be dated well before the relationship's official start — a
 * "how we met" backstory chapter, say — so that field is a narrative label,
 * not an unlock date), but by counting monthsaries and revealing that many
 * chapters, oldest first.
 */
export function getElapsedMonthsaries(startDate: Date, now: Date = new Date()): number {
  const rawMonths =
    (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  const elapsed = now.getDate() < CHAPTER_DAY ? rawMonths - 1 : rawMonths;
  return Math.max(0, elapsed);
}
