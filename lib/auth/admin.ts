import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Who counts as the keeper of the book.
 *
 * This is a two-person archive where both accounts see and edit everything —
 * there is no role column and no reason to add one. The single asymmetry is
 * that one account can empty the trash for good, so admin-ness is decided
 * here, by identity, rather than modelled in the schema.
 *
 * Matched on the email's local part (case-insensitively) so it doesn't matter
 * which mail host the account uses. `ADMIN_EMAILS` (comma-separated, full
 * addresses) overrides the list entirely when set.
 */
const ADMIN_USERNAMES = ["jdiniega202"];

function adminEmailsFromEnv(): string[] | null {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return null;
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  const configured = adminEmailsFromEnv();
  if (configured) return configured.includes(normalized);

  const localPart = normalized.split("@")[0];
  return ADMIN_USERNAMES.includes(localPart);
}

/** Whether the *currently signed-in* user is the admin. Safe to call anywhere server-side. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

/**
 * Throws unless the caller is the admin.
 *
 * Every destructive admin action must call this *itself*, not rely on the UI
 * having hidden a button — a Server Action is a public endpoint, and hiding
 * the link is decoration, not access control.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isCurrentUserAdmin())) {
    throw new Error("Not allowed.");
  }
}
