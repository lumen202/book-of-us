import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Schema } from "./project";

/**
 * Service-role Supabase client. **Bypasses RLS entirely.**
 *
 * This exists for exactly one reason: permanently destroying a memory is the
 * only operation the app's normal role cannot perform. `memories` has no
 * DELETE policy (see `0001_init.sql`), and that's on purpose — the absence of
 * the policy is what makes accidental hard deletes impossible for everyone
 * else.
 *
 * Rules for touching this file:
 *
 * - Only ever import it from a Server Action or Route Handler that has already
 *   called `requireAdmin()` — or, for the one context with no signed-in user
 *   at all, a Route Handler gated on the `CRON_SECRET` shared secret instead
 *   (`app/api/cron/create-chapter/route.ts`; see `lib/chapters/mutations.ts`
 *   for why chapter creation needs this client). Never from a Server
 *   Component that renders for any signed-in user, and never from anything
 *   under `components/`.
 * - `server-only` above makes an accidental client import a build error rather
 *   than a leaked key.
 * - Anything that isn't a permanent delete belongs on `lib/supabase/server.ts`,
 *   where RLS still applies.
 *
 * `schema` defaults to `"public"` (the real project) — the safe choice for
 * the one caller with no signed-in user at all (the cron route). Callers
 * that already know they're acting on behalf of the demo account (
 * `purgeMemory`/`purgeVaultItem`, `scripts/seed-demo.ts`) pass `"demo"`
 * explicitly instead of inferring it here, since this file has no request
 * context of its own to read `bou_project` from.
 */
export function createAdminClient(schema: Schema = "public") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured — permanent deletion is unavailable.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
