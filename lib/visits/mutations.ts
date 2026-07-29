import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/auth/admin";

/**
 * Marks a browser session as already counted. No max-age: the cookie is
 * cleared when the browser itself closes, which is what makes a "visit"
 * mean a new session rather than every page navigation within one.
 */
export const VISIT_COOKIE = "bou_visited";

/**
 * Logs one row to `partner_visits`, but only the first time in a session and
 * only for the partner — the keeper opening their own book doesn't count as
 * a visit. Called from middleware, the one place that sees every request
 * and can set the session cookie before a page renders.
 */
export async function recordPartnerVisit(
  supabase: SupabaseClient,
  email: string | null | undefined,
  alreadyMarkedThisSession: boolean,
): Promise<boolean> {
  if (alreadyMarkedThisSession || isAdminEmail(email)) return false;
  await supabase.from("partner_visits").insert({});
  return true;
}
