/**
 * Spoken lines, delivered one at a time with a pause between each.
 *
 * **Only the 5th gets these.** The everyday envelope opens in silence — see
 * `sequences/EnvelopeOpening.tsx` for why. If a set of everyday lines ever
 * comes back, it has to earn being different from the monthsary ones.
 *
 * Rule for adding lines: one sentence, one breath. If a line needs a comma
 * splice to fit, it's two lines.
 */

/**
 * The 5th's lines land *after* the letter and build straight into the
 * "Happy Nth Monthsary" reveal, so they're written as a run-up to it — the
 * last one should leave a gap that the greeting fills.
 */
export const monthsaryWhispers: readonly string[] = [
  "It's the 5th again.",
  "Another month of us.",
  "I've been counting.",
];
