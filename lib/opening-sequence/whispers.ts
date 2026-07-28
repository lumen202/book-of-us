/**
 * Spoken lines, delivered one at a time with a pause between each.
 *
 * **Only the 5th gets these.** Rule for adding lines: one sentence, one breath.
 * If a line needs a comma splice to fit, it's two lines.
 *
 * They land *after* the letter and build straight into the "Happy Nth
 * Monthsary" reveal, so they're written as a run-up to it — the last line
 * should leave a gap that the greeting fills, not close the thought itself.
 *
 * ## Why these are a function of the month number
 *
 * The first set said "It's the 5th again." / "Another month of us." — which is
 * a calendar notification, and on the *first* monthsary it is also just wrong:
 * there is no "again", and no "another". Copy that has to hedge for every case
 * ends up phrased like a form letter, which is exactly the mechanical feeling
 * this rewrite was for.
 *
 * So there are two sets. Month one gets to be about the fact that none of this
 * existed a month ago, which is only true once and is the most interesting
 * thing about that particular day. Every month after gets to be about
 * accumulation instead.
 */

/**
 * These carry the same register as the letter a few beats earlier — warm,
 * teasing, and slightly embarrassed about being warm. See the long note on
 * `letter` in `sequences/MonthsaryOpening.tsx`; the short version is that a
 * joke is what earns the sincere line next to it, and the joke is always at the
 * speaker's expense.
 *
 * The shape both sets use is the same: **tease, beat, then the sincere one.**
 * The third line is the one that has to leave a gap the greeting can fall into,
 * so it is the shortest and the most direct.
 */

/**
 * ## The names are theirs, and that is the whole point
 *
 * A private name is the strongest possible proof that something was written for
 * one specific person, and it is the one thing no amount of good general copy
 * can fake. Everything here read as *written for someone* the moment they went
 * in. There are two kinds and they are not interchangeable:
 *
 * - **The everyday ones.** She is "dai"; he is "kuya" or "ya". Plain, real, and
 *   what they actually call each other day to day.
 * - **The playful ones.** "my habibi" for address, and "scammer" / "uwagan" for
 *   outright teasing.
 *
 * The term of address here is **"my habibi"** rather than the everyday "dai",
 * and that is a deliberate choice: "dai" is accurate but neutral, and it lets a
 * line sit flat. "my habibi" arrives already carrying the joke *and* the
 * affection, which is exactly the register the whole ceremony is written in —
 * it does the work of a wink without needing a separate one.
 *
 * Everything here is in **his voice, addressed to her**, which is why
 * "kuya"/"ya" never appears. If a line is ever written the other way round,
 * that flips.
 *
 * Keep the teasing affectionate and light — it works because it is obviously
 * fond, so anything that could land as an actual complaint is over the line.
 *
 * **These are not generic.** If this project is ever forked or reused, these
 * two arrays and the letters in `sequences/MonthsaryOpening.tsx` are the first
 * things to rewrite.
 *
 * ## And every set ends with "I love you"
 *
 * It was missing entirely, which is a strange hole in a monthsary ceremony. It
 * goes last, alone, right before the greeting lands — after three lines of
 * joking, the plainest possible sentence is the one that carries. Said earlier,
 * or dressed up, it would just be more copy.
 */

/**
 * The first monthsary. Its whole emotional content is that a month ago none of
 * this existed — so it gets to be about her having walked into something.
 */
const FIRST_MONTH = [
  "A month ago you had no idea what you were signing up for.",
  "Too late now, my habibi.",
  "I'm keeping you — scammer and all.",
  "I love you.",
] as const;

/**
 * Every month after. Deliberately not about the date or the count — those are
 * already on screen in the greeting, and repeating them is what made the old
 * lines ("It's the 5th again.") feel like an announcement. These are about
 * accumulation, and about the unremarkable days being the good ones, which is
 * the argument the whole book is making.
 */
const LATER_MONTHS = [
  "Still a scammer. Still uwagan. Still mine.",
  "Another month, and I kept every bit of it.",
  "Especially the boring parts.",
  "I love you, my habibi.",
] as const;

export function monthsaryWhispers(monthsaryNumber?: number): readonly string[] {
  return monthsaryNumber === 1 ? FIRST_MONTH : LATER_MONTHS;
}
