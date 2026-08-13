import { mulberry32 } from "@/lib/ambient/rng";
import type { Memory } from "@/lib/memories/types";

/** How many recently-shown ids `lib/relationship/mutations.ts`'s `recordSurpriseShown` keeps. */
export const RECENT_CAP = 5;

/**
 * The "~1 visit in 3" gate `app/(app)/page.tsx` uses to decide whether to
 * fetch a candidate at all. Kept as its own function (rather than an inline
 * `Math.random()` in the page's render body) so the impure call isn't
 * flagged by React's purity lint rule for Server Components.
 */
export function shouldRollSurprise(): boolean {
  return Math.random() < 1 / 3;
}

/**
 * Weighted-random "on this day / from the book" pick over the whole archive.
 *
 * Excludes: soft-deleted/locked rows (already filtered out by
 * `getAllMemories()` before this ever runs), anything hand-marked
 * `resurface_excluded`, anything from the current calendar month (nothing
 * just added should resurface as a "remember this?" the same week it was
 * posted), and the last `RECENT_CAP` shown ids (cooldown, so the same print
 * doesn't repeat every third visit).
 *
 * Weights same-day-of-month matches to `now` 6x over everything else — an
 * anniversary-ish nudge, not a hard filter, so a quiet month with no exact
 * match still gets a surprise rather than none. Seeded by `now`'s calendar
 * day (not per-request) so a viewer who refreshes doesn't watch the surprise
 * change out from under them mid-visit — same reasoning as
 * `lib/places/engine.ts`'s `dailyPick`.
 */
export function pickSurprise(
  memories: readonly Memory[],
  now: Date,
  excludeIds: ReadonlySet<string>,
): Memory | null {
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pool = memories.filter((memory) => {
    if (memory.resurface_excluded) return false;
    if (excludeIds.has(memory.id)) return false;
    const occurredMonthKey = memory.occurred_at.slice(0, 7);
    return occurredMonthKey !== currentMonthKey;
  });
  if (pool.length === 0) return null;

  const today = now.getDate();
  const weights = pool.map((memory) => {
    const { day } = { day: Number(memory.occurred_at.slice(8, 10)) };
    return day === today ? 6 : 1;
  });

  const seed =
    now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const rng = mulberry32(seed);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
