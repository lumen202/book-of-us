/**
 * Philippine seasons, not the four temperate ones.
 *
 * This book is read in the Philippines, where there is no winter/autumn to
 * shift the mood with — the year moves through the cool northeast-monsoon
 * months, the hot dry stretch before the rains, and the long wet season. A
 * "winter" palette in Manila is a palette that never matches what's outside
 * the window.
 *
 * - `amihan` — Nov–Feb, cool and dry (northeast monsoon)
 * - `tag-init` — Mar–May, hot and dry
 * - `tag-ulan` — Jun–Oct, rainy (habagat)
 */
export type Season = "amihan" | "tag-init" | "tag-ulan";

export const seasons: readonly Season[] = ["amihan", "tag-init", "tag-ulan"];

/**
 * Storybook palette — hand-painted picture-book art direction (Ghibli, not
 * editorial romance): cream paper, meadow teal, apricot sunlight, warm brown
 * ink.
 *
 * The rules that keep it from drifting cold again (it did once, and the site
 * read as severe):
 *
 * - **No true black and no true grey.** `ink` is a warm brown; every neutral
 *   carries yellow. A desaturated hex here is the tell that something has gone
 *   clinical.
 * - **Nothing darker than the ink.** Backgrounds stay light in every mode,
 *   including Celebration — the 5th is a sunrise, not a night scene.
 * - **Two accents, always both.** `accent` is the cool one (meadow/sky/water)
 *   and `accentWarm` is the sunlight. Using only one is what flattens the
 *   painting; the warmth is what stops the cool from reading as cold.
 *
 * Season variants only ever override the accents, so the neutrals stay stable
 * while the book's mood shifts through the year.
 */
export const baseTokens = {
  color: {
    background: "#fdf6e6",
    surface: "#fffdf7",
    ink: "#4c3b30",
    inkMuted: "#8d7460",
    accent: "#7bb0a6",
    /** Soft wash of `accent` — glows, gradients, large fills. */
    accentMuted: "#cfe3dc",
    /** The sunlight in every scene. Never drop this in favour of `accent`. */
    accentWarm: "#e8a06b",
    border: "#e7d5bb",
  },
} as const;

type SeasonAccents = { accent: string; accentMuted: string; accentWarm: string };

export const seasonAccents: Record<Season, SeasonAccents> = {
  /** Cool mornings, high clear skies. */
  amihan: { accent: "#8fb8cf", accentMuted: "#d7e7ef", accentWarm: "#efc389" },
  /** Mango season — hot light, everything a little bleached. */
  "tag-init": { accent: "#8cbcae", accentMuted: "#dcebe2", accentWarm: "#e5a659" },
  /** Wet leaves, green everywhere, softer light. */
  "tag-ulan": { accent: "#6fac9c", accentMuted: "#cde4dc", accentWarm: "#dfa07a" },
};

/** A fixed, deterministic mapping from month — see the `Season` doc comment. */
export function getSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0 = January
  if (month >= 10 || month <= 1) return "amihan"; // Nov–Feb
  if (month <= 4) return "tag-init"; // Mar–May
  return "tag-ulan"; // Jun–Oct
}

/**
 * Celebration Mode (5th of every month, see lib/celebration/isCelebrationDay.ts)
 * has **no palette of its own** — there is deliberately no `celebrationTokens`
 * here, and no `[data-celebration]` colour block in globals.css.
 *
 * The 5th distinguishes itself by what happens on it: the opening ceremony,
 * the illustrated monthsary scene, the greeting. Recolouring every page on top
 * of that was tried and removed — it read as "a different site today" rather
 * than "a special day", and this palette is the one worth keeping year-round.
 *
 * `data-celebration` is still set on <html>, so behaviour (not colour) can
 * still branch on it.
 */
