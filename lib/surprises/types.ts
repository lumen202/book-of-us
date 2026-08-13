import type { Memory } from "@/lib/memories/types";

/** Per-role cooldown state — see `lib/relationship/queries.ts`'s `getSurpriseCooldown`. */
export type SurpriseCooldown = {
  /** Most-recently-shown first, capped at `RECENT_CAP` in `pick.ts`. */
  recentIds: string[];
  lastShownAt: string | null;
};

/** One resurfaced memory, ready to render — see `queries.ts`'s `getSurpriseCandidate`. */
export type SurpriseCandidate = {
  memory: Memory;
  chapterSlug: string | null;
  thumbnailUrl: string | null;
};
