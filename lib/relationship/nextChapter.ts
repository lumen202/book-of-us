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
