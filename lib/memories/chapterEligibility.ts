import { toLocalDate } from "@/lib/format/date";

/**
 * The pure half of `findLookBackPrints` (in `./queries.ts`): which chapters
 * are even candidates, before any database read happens. Split into its own
 * file — with no `server-only`/Supabase imports in its chain — so the
 * current-month exclusion can be pinned by a test that doesn't need a live
 * Supabase connection. That exclusion has been wrong twice in this project's
 * history (see `docs/agent/log/2026-07-27-chapter-reveal-date-gating.md` and
 * `docs/agent/log/2026-07-29-preview-button-broke-under-current-month-exclusion.md`).
 */
export function filterEligibleChapters(
  chapters: { id: string; month: string }[],
  now: Date,
  excludeCurrentMonth: boolean,
): { id: string; month: string }[] {
  if (!excludeCurrentMonth) return chapters;

  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  return chapters.filter((chapter) => {
    const chapterDate = toLocalDate(chapter.month);
    return `${chapterDate.getFullYear()}-${chapterDate.getMonth()}` !== currentMonthKey;
  });
}
