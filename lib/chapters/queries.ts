import { parseDateOnly, toLocalDate } from "@/lib/format/date";
import { getAppNow } from "@/lib/relationship/devClock";
import { getElapsedMonthsaries } from "@/lib/relationship/nextChapter";
import { getRelationship } from "@/lib/relationship/queries";
import { createClient } from "@/lib/supabase/server";
import type { Chapter } from "./types";

/**
 * Chapters have no time-capsule concept of their own (only individual
 * memories lock/unlock), so a plain RLS-protected select is fine here —
 * unlike lib/memories/queries.ts, which must go through an RPC.
 *
 * They do unlock one at a time, though. Chapter 1 is the month the
 * relationship started (`relationship.started_at`) — visible from day one,
 * not gated behind waiting for a monthsary to pass — and each monthsary after
 * that unlocks one more, oldest-first: `getElapsedMonthsaries(...) + 1`
 * chapters unlocked in total. Deliberately **not** gated by comparing each
 * chapter's own `month` field to today: that field can predate the
 * relationship's official start (a "how we met" backstory chapter, say), so
 * it's a narrative label, not an unlock date. What unlocks a chapter is
 * simply being next in line.
 *
 * Filtered here in application code rather than in SQL — this is pacing, not
 * a security boundary (both partners already see the same shared book), so
 * there's no need for the RPC-enforced pattern memories use. Both entry
 * points below go through `listRevealedChapters`, so a not-yet-unlocked
 * chapter is invisible on the shelf *and* 404s if its slug is guessed or
 * bookmarked in advance.
 */

async function listRevealedChapters(): Promise<Chapter[]> {
  const supabase = await createClient();
  const [{ data, error }, relationship] = await Promise.all([
    supabase.from("chapters").select("*").is("deleted_at", null).order("month", { ascending: true }),
    getRelationship(),
  ]);

  if (error) throw error;
  if (!relationship) return []; // no start date yet — nothing has unlocked

  const oldestFirst = (data ?? []) as Chapter[];
  // +1: the start month itself is chapter one, on day one — it doesn't wait
  // for a monthsary. getElapsedMonthsaries only counts monthsaries *after* that.
  const unlockedCount = getElapsedMonthsaries(toLocalDate(relationship.started_at), getAppNow()) + 1;
  return oldestFirst.slice(0, unlockedCount);
}

export async function listChapters(): Promise<Chapter[]> {
  const revealed = await listRevealedChapters();
  // Unlock order is oldest-first; the shelf still reads newest-first.
  return [...revealed].reverse();
}

export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  const revealed = await listRevealedChapters();
  return revealed.find((chapter) => chapter.slug === slug) ?? null;
}

/**
 * Where a bucket-list promise lands when it's kept — see
 * `docs/agent/codebase-map/bucket-list.md` for the full trap this avoids.
 *
 * The obvious answer, "the current month's chapter", is wrong on this app's
 * own terms: chapters aren't pre-seeded, so the current month may have no
 * chapter row at all, and even a chapter that exists for it may not be
 * *revealed* yet (chapters unlock one per monthsary). Landing a memory in an
 * unrevealed chapter means the person who just ticked a promise watches the
 * photograph they were shown a second ago vanish from the shelf — the single
 * worst failure mode this feature could have.
 *
 * So: the current month's chapter **only if it's already revealed**,
 * otherwise the newest chapter that is. `occurred_at` on the memory still
 * records the true date, so once that month's chapter is written the memory
 * can be moved into it with a one-line update — nothing here is lost, only
 * temporarily filed under an earlier page.
 *
 * Throws only in the state that's impossible in practice: chapter one is
 * revealed from day one, so there's always somewhere for this to land once a
 * relationship has been set up at all.
 */
export async function resolveTargetChapter(now: Date = getAppNow()): Promise<Chapter> {
  const revealed = await listRevealedChapters(); // oldest-first
  if (revealed.length === 0) {
    throw new Error("There's no chapter yet for this to land in — write chapter one first.");
  }

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthChapter = revealed.find((chapter) => {
    const { year, month } = parseDateOnly(chapter.month);
    return `${year}-${String(month).padStart(2, "0")}` === currentMonthKey;
  });

  // Fall back to the newest *revealed* chapter — never the newest chapter
  // outright, which might be sitting unrevealed one slot ahead of this one.
  return currentMonthChapter ?? revealed[revealed.length - 1];
}
