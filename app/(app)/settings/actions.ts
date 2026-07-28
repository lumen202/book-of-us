"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";

export type PasswordActionState = { status: "success" | "error"; message: string } | null;

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

/** Admin-only lookup so the settings page can label whose password the form below changes. */
export async function getPartnerEmail(): Promise<string | null> {
  await requireAdmin();

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
