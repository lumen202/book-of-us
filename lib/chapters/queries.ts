import { parseDateOnly, toLocalDate } from "@/lib/format/date";
import { getAppNow } from "@/lib/relationship/devClock";
import { createClient } from "@/lib/supabase/server";
import type { Chapter } from "./types";

/**
 * Chapters have no time-capsule concept of their own (only individual
 * memories lock/unlock), so a plain RLS-protected select is fine here —
 * unlike lib/memories/queries.ts, which must go through an RPC.
 *
 * A chapter is revealed once its own calendar month has arrived —
 * `chapter.month <= start of this calendar month` — full stop. Chapters are
 * auto-created for the current month on its 1st (`lib/chapters/mutations.ts`
 * + the cron route that calls it), so in the normal case this check passes
 * the instant a chapter exists at all. It stays a real check rather than
 * "just show everything that exists" so a chapter dated in the future (a
 * backstory chapter authored ahead of time, say) still can't leak onto the
 * shelf early.
 *
 * This used to be gated by counting elapsed monthsaries since
 * `relationship.started_at` instead (one reveal per monthsary, oldest chapter
 * first) — see `docs/agent/log/2026-07-27-chapter-gating-corrected-to-monthsary-count.md`.
 * That model existed to survive bulk-seeded chapters dated arbitrarily far
 * from "today"; now that the only creation path is the 1st-of-month cron,
 * every chapter's own `month` already agrees with when it should reveal, so
 * the simpler calendar check is correct and the monthsary-count machinery
 * (`getElapsedMonthsaries`) was removed as dead code.
 *
 * Filtered here in application code rather than in SQL — this is pacing, not
 * a security boundary (both partners already see the same shared book), so
 * there's no need for the RPC-enforced pattern memories use. Both entry
 * points below go through `listRevealedChapters`, so a not-yet-revealed
 * chapter is invisible on the shelf *and* 404s if its slug is guessed or
 * bookmarked in advance.
 */

async function listRevealedChapters(): Promise<Chapter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .is("deleted_at", null)
    .order("month", { ascending: true });

  if (error) throw error;

  const now = getAppNow();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return ((data ?? []) as Chapter[]).filter(
    (chapter) => toLocalDate(chapter.month) <= startOfCurrentMonth,
  );
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
