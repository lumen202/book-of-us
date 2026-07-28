/**
 * The line under "Happy Nth Monthsary" — the last thing said before the book
 * opens. Picked server-side so it's stable through hydration, and rotated so
 * the 5th isn't word-for-word identical every month.
 *
 * ## What these are trying not to be
 *
 * Greeting-card copy. The tell is milestone language and superlatives — "so
 * blessed", "here's to forever", "my everything" — which are about the
 * *occasion* rather than about two specific people, and read as written for an
 * audience. Everything below is small, concrete and slightly understated on
 * purpose: this book's whole argument is that the ordinary days are the point,
 * so its one big line should sound like something one person actually says to
 * another, not something printed inside a card.
 *
 * ## Why it splits on the month number
 *
 * "Another month" and "same love, new month" are simply false on the first
 * monthsary — there is no "another" yet — and that is what made the first one
 * land as a form letter. Copy bent to be true in every case ends up phrased
 * like copy bent to be true in every case, so month one gets its own set and is
 * allowed to be about the fact that none of this existed thirty days ago, which
 * is only interesting once.
 */

/** Only ever true once, so it gets to be about the newness. */
export const firstMonthsaryMessages: readonly string[] = [
  "One month in, and the book already has weight.",
  "A month ago none of this existed. Now look at it.",
  "The first page, and already my favorite.",
];

/** Every month after: accumulation rather than novelty. */
export const monthsaryMessages: readonly string[] = [
  "Another month, still choosing you.",
  "Still you. Still this. Still glad.",
  "One more month of ordinary days worth keeping.",
  "Nothing spectacular happened. It was perfect.",
  "The book keeps getting heavier. So do I, about you.",
];

export function pickMonthsaryMessage(
  monthsaryNumber?: number,
  random: () => number = Math.random,
): string {
  const pool = monthsaryNumber === 1 ? firstMonthsaryMessages : monthsaryMessages;
  return pool[Math.floor(random() * pool.length)];
}
