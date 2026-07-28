"use server";

import { createClient } from "@/lib/supabase/server";
import { getVaultSignedUrl } from "@/lib/vault/getVaultSignedUrl";
import { insertVaultItem, softDeleteVaultItem, type NewVaultItemInput } from "@/lib/vault/mutations";
import { listVaultItems } from "@/lib/vault/queries";
import { clearVaultReaction, setVaultReaction } from "@/lib/vault/reactions";
import type { VaultItemView } from "@/lib/vault/types";

export type UnlockResult =
  | { ok: true; items: VaultItemView[]; currentUserId: string | null }
  | { ok: false; message: string };

/**
 * Step-up re-auth, not a second account or a stronger data boundary.
 *
 * Whoever is signed in already has full RLS access to `vault_items` — same
 * `auth.uid() is not null` policy as every other table in this two-person
 * book. Re-checking the password here (the same `signInWithPassword` check
 * `changeMyPassword` uses) is purely a UX gate against a device left signed
 * in and unattended; it's the vault's front door, not its lock.
 *
 * Deliberately fetches the item list in the same action rather than a
 * separate round trip: nothing about the vault's contents — not even a
 * signed thumbnail URL — should ever reach the browser before the password
 * check has already passed.
 */
export async function unlockVault(
  _prevState: UnlockResult | null,
  formData: FormData,
): Promise<UnlockResult> {
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, message: "You need to be signed in." };

  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (error) return { ok: false, message: "That password isn't right." };

  const items = await listVaultItems();
  return { ok: true, items, currentUserId: user.id };
}

export async function addVaultItem(input: NewVaultItemInput): Promise<void> {
  await insertVaultItem(input);
}

export async function removeVaultItem(id: string): Promise<void> {
  await softDeleteVaultItem(id);
}

/** Minted on demand when a specific photo is opened — see `listVaultItems`'s note on why the grid only ever carries thumbnails. */
export async function getVaultItemFullUrl(storagePath: string): Promise<string | null> {
  return getVaultSignedUrl(storagePath, "full");
}

export async function reactToVaultItem(vaultItemId: string, emoji: string): Promise<void> {
  await setVaultReaction(vaultItemId, emoji);
}

export async function unreactToVaultItem(vaultItemId: string): Promise<void> {
  await clearVaultReaction(vaultItemId);
}
