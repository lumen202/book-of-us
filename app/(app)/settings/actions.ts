"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { getActiveProjectFromCookies } from "@/lib/supabase/project.server";
import { updateLoveLetter, updateWhisperLines } from "@/lib/relationship/mutations";

export type PasswordActionState = { status: "success" | "error"; message: string } | null;
export type LoveLetterActionState = { status: "success" | "error"; message: string } | null;
export type WhisperActionState = { status: "success" | "error"; message: string } | null;

export async function saveLoveLetter(
  _prevState: LoveLetterActionState,
  formData: FormData,
): Promise<LoveLetterActionState> {
  try {
    await updateLoveLetter({
      salutation: String(formData.get("salutation") ?? ""),
      body: String(formData.get("body") ?? ""),
      signoff: String(formData.get("signoff") ?? ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't save the letter — try again.";
    return { status: "error", message };
  }

  return { status: "success", message: "Your letter has been saved." };
}

export async function saveWhisper(
  _prevState: WhisperActionState,
  formData: FormData,
): Promise<WhisperActionState> {
  const lines = String(formData.get("lines") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  try {
    await updateWhisperLines(lines);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't save the whisper — try again.";
    return { status: "error", message };
  }

  return { status: "success", message: "Your whisper has been saved." };
}

export async function changeMyPassword(
  _prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    return { status: "error", message: "New password needs at least 8 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { status: "error", message: "You need to be signed in." };

  // Supabase's client-side updateUser() doesn't check the old password on its
  // own — re-authenticating first is what makes this a "change" and not just
  // an unchecked overwrite.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { status: "error", message: "That current password isn't right." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { status: "error", message: "Couldn't change the password — try again." };

  return { status: "success", message: "Your password has been changed." };
}

/**
 * Admin-only lookup so the settings page can label whose password the form
 * below changes.
 *
 * **Never for the demo account.** `auth.users` is global — not scoped by
 * Postgres schema the way every other table is (see
 * `lib/supabase/project.ts`) — so `listUsers()` here would otherwise return
 * the *real* couple's accounts too, and hand a demo visitor a real email
 * address. There is no legitimate "partner" for a lone demo account anyway,
 * so this refuses outright rather than trying to filter the real accounts
 * back out of a list that should never have been fetched for this session.
 */
export async function getPartnerEmail(): Promise<string | null> {
  await requireAdmin();
  if ((await getActiveProjectFromCookies()) === "demo") return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Never silently fall through to "any user" — with no confirmed session,
  // `entry.id !== undefined` would be true for every account, including our
  // own, and this is a lookup that a real password change hangs off.
  if (!user) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) return null;

  return data.users.find((entry) => entry.id !== user.id)?.email ?? null;
}

export async function changePartnerPassword(
  _prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  await requireAdmin();

  // Same reasoning as `getPartnerEmail`: `auth.users` is global, so without
  // this the demo account — which is admin/keeper by design (see
  // `ADMIN_USERNAMES`) — could overwrite a *real* account's actual sign-in
  // password. The demo has no partner to manage a password for in the first
  // place, so this refuses before ever calling `listUsers()`.
  if ((await getActiveProjectFromCookies()) === "demo") {
    return { status: "error", message: "Not available in the demo." };
  }

  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) {
    return { status: "error", message: "New password needs at least 8 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Same guard as getPartnerEmail: with no confirmed session, `entry.id !==
  // undefined` matches every account, including our own — that must never
  // silently become the "partner" this action overwrites the password of.
  if (!user) return { status: "error", message: "You need to be signed in." };

  const admin = createAdminClient();
  const { data, error: listError } = await admin.auth.admin.listUsers();
  if (listError) return { status: "error", message: "Couldn't find the other account — try again." };

  const partner = data.users.find((entry) => entry.id !== user.id);
  if (!partner) return { status: "error", message: "Couldn't find the other account." };

  const { error } = await admin.auth.admin.updateUserById(partner.id, { password: newPassword });
  if (error) return { status: "error", message: "Couldn't change the password — try again." };

  return { status: "success", message: "Their password has been changed." };
}
