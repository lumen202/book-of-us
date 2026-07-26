export type Season = "winter" | "spring" | "summer" | "autumn";

export const seasons: readonly Season[] = ["winter", "spring", "summer", "autumn"];

/**
 * Warm "quiet luxury" base palette — parchment/ink neutrals with a single
 * gold accent. Season variants below only ever override `accent`/`accentMuted`,
 * so the base neutrals stay stable while the book's mood shifts through the year.
 */
export const baseTokens = {
  color: {
    background: "#faf6ef",
    surface: "#ffffff",
    ink: "#2b241c",
    inkMuted: "#6b6153",
    accent: "#b8863f",
    accentMuted: "#d9c9a8",
    border: "#e6ddc9",
  },
} as const;

export const seasonAccents: Record<Season, { accent: string; accentMuted: string }> = {
  winter: { accent: "#5f7d95", accentMuted: "#c9d3da" },
  spring: { accent: "#8fa876", accentMuted: "#d6e0c9" },
  summer: { accent: "#d99a4e", accentMuted: "#f0dcb8" },
  autumn: { accent: "#b8623f", accentMuted: "#e3c3b3" },
};

/** Meteorological seasons (Northern hemisphere) — a fixed, deterministic mapping from month. */
export function getSeason(date: Date = new Date()): Season {
  const month = date.getMonth();
  if (month === 11 || month <= 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "autumn";
}

/**
 * Celebration Mode (5th of every month, see lib/celebration/isCelebrationDay.ts)
 * overrides season entirely rather than blending with it — the 5th should feel
 * like a distinct, recognizable occasion, not a slightly-warmer version of
 * whatever season it happens to fall in.
 */
export const celebrationTokens = {
  color: {
    background: "#fbf1df",
    accent: "#c9962f",
    accentMuted: "#f2dfa0",
  },
} as const;
