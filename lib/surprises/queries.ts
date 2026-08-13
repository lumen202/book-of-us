import { getAllMemories, getMemoryChapterLinks, resolveMemoryMedia } from "@/lib/memories/queries";
import { getAppNow } from "@/lib/relationship/devClock";
import { getRelationship, getSurpriseCooldown } from "@/lib/relationship/queries";
import { pickSurprise } from "./pick";
import type { SurpriseCandidate } from "./types";

/**
 * The book has to hold a real handful of memories before "here's an old one"
 * means anything — below this, every visit would resurface something from
 * last week, which reads as broken rather than nostalgic.
 */
const MIN_POOL_SIZE = 8;

/**
 * One memory to resurface for the current viewer, or `null` if there isn't a
 * good one — either the archive is too small yet, or every eligible memory
 * is in cooldown. Callers (see `app/(app)/page.tsx`) are responsible for the
 * "only ~1 visit in 3" gate; this function always returns its best pick when
 * asked.
 */
export async function getSurpriseCandidate(viewerIsKeeper: boolean): Promise<SurpriseCandidate | null> {
  const [allMemories, relationship] = await Promise.all([getAllMemories(), getRelationship()]);
  if (allMemories.length < MIN_POOL_SIZE) return null;

  const cooldown = getSurpriseCooldown(relationship, viewerIsKeeper);
  const picked = pickSurprise(allMemories, getAppNow(), new Set(cooldown.recentIds));
  if (!picked) return null;

  const [links, [withMedia]] = await Promise.all([
    getMemoryChapterLinks([picked.id]),
    resolveMemoryMedia([picked], { full: false }),
  ]);

  return {
    memory: picked,
    chapterSlug: links[0]?.chapterSlug ?? null,
    thumbnailUrl: withMedia.thumbnailUrl ?? withMedia.mediaUrl,
  };
}
