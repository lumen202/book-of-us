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
  // Schema-generic: middleware.ts's client may be typed for either the real
  // (`public`) or demo schema depending on which is active, and this
  // function works identically against both.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  email: string | null | undefined,
  alreadyMarkedThisSession: boolean,
): Promise<boolean> {
  if (alreadyMarkedThisSession || isAdminEmail(email)) return false;
  await supabase.from("partner_visits").insert({});
  return true;
}
