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

/**
 * The garden palette — colours that exist only for the painted world in
 * `components/ambient/`, never for UI.
 *
 * These are a deliberate widening of the token set, and the reason is
 * arithmetic: the four base colours are cream, warm brown, meadow teal and
 * apricot, and **no mix of them reaches green, pink, lavender or butter
 * yellow**. Teal mixed toward apricot is near-complementary, so it lands on
 * khaki; teal mixed toward cream lands on mint. The backdrop was built that way
 * once and the result was a beautiful, olive, slightly melancholy countryside —
 * technically right and emotionally wrong for a book about two people in love.
 *
 * So: a small, named set of scene pigments, in one place, themeable, with the
 * same rules as the base palette (nothing darker than the ink, no true grey,
 * every neutral carries yellow). `lib/ambient/palette.ts` mixes everything the
 * scene paints out of *these plus* the base tokens, and nothing in the scene is
 * allowed a literal hex.
 *
 * **Do not use these for UI.** Buttons, borders, cards and type stay on
 * `baseTokens` — that separation is what keeps the world from leaking into the
 * interface and making the book look like a different site.
 */
export const gardenTokens = {
  color: {
    /** Fresh spring green. The dominant colour of the world. */
    leaf: "#93c46b",
    /** Foliage in shade. Still green — never olive, never brown. */
    leafDeep: "#5d9a56",
    /** Gentle pink: blossom, petals, the pink wildflowers. */
    blossom: "#f0a8bb",
    /** Muted lavender, for the lavender drifts and for cool shadow. */
    lilac: "#b7a9dc",
    /** Butter yellow — the sunlight, warmer and less orange than `accentWarm`. */
    butter: "#f8d98d",
    /** Optimistic pastel sky. */
    sky: "#9ecfec",
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

/**
 * The one garden pigment the seasons move: how green the world is.
 *
 * Blossom, lilac and butter stay put all year — the flowers in this garden are
 * a constant, and shifting them would make the world feel like a different
 * place in June than in December, which is exactly what it must not feel like.
 * The leaf tone, though, is the difference between the bleached end of the dry
 * season and the middle of the rains, and it is worth having.
 */
export const seasonLeaf: Record<Season, { leaf: string; leafDeep: string }> = {
  amihan: { leaf: "#9ac773", leafDeep: "#629c5b" },
  "tag-init": { leaf: "#a8ca77", leafDeep: "#6d9e58" },
  "tag-ulan": { leaf: "#87c065", leafDeep: "#53924f" },
};

/**
 * Which season the book is in right now — set by hand, not computed from
 * today's date. Edit this directly when the season actually changes; see the
 * `Season` doc comment above for the rough months each one covers.
 */
export const CURRENT_SEASON: Season = "tag-ulan";

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
