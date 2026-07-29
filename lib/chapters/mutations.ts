import { formatMonthYear } from "@/lib/format/date";
import { getAppNow } from "@/lib/relationship/devClock";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Creates the chapter row for the current calendar month, if one doesn't
 * exist yet. Called from the cron route on the 1st of every month — there is
 * no signed-in user in that context, so this goes through the admin client
 * rather than `lib/supabase/server.ts`. Chapters carry no per-user RLS split
 * either way (see `data-model.md`), so this isn't bypassing an ownership
 * check, just standing in for the session that doesn't exist here.
 *
 * Idempotent: `chapters.month` is unique, so `ignoreDuplicates` makes a
 * retried or double-fired cron invocation a silent no-op instead of an error.
 */
export async function ensureCurrentMonthChapter(now: Date = getAppNow()): Promise<void> {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthIso = `${year}-${month}-01`;
  const slug = `${year}-${month}`;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("chapters")
    .upsert(
      { slug, title: formatMonthYear(monthIso), month: monthIso, atmosphere: {} },
      { onConflict: "month", ignoreDuplicates: true },
    );

  if (error) throw error;
}
