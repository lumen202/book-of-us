import "server-only";

import { createClient } from "@/lib/supabase/server";

/** A curated set fitting the vault's own mood — same idea as `REACTION_EMOJIS` in `lib/reactions/types.ts`, a different mood entirely. */
export const VAULT_REACTION_EMOJIS = ["🔥", "😏", "🥵", "😈", "💦"] as const;

export type VaultReactionEmoji = (typeof VAULT_REACTION_EMOJIS)[number];

export type VaultReaction = {
  vaultItemId: string;
  userId: string;
  emoji: string;
};

/** One query for every item on the page, same shape as `getReactionsForMemories`. */
export async function getReactionsForVaultItems(vaultItemIds: string[]): Promise<VaultReaction[]> {
  if (vaultItemIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_reactions")
    .select("vault_item_id, user_id, emoji")
    .in("vault_item_id", vaultItemIds)
    .is("deleted_at", null);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    vaultItemId: row.vault_item_id as string,
    userId: row.user_id as string,
    emoji: row.emoji as string,
  }));
}

export function groupReactionsByVaultItem(
  reactions: VaultReaction[],
): Record<string, VaultReaction[]> {
  const byItem: Record<string, VaultReaction[]> = {};
  for (const reaction of reactions) {
    (byItem[reaction.vaultItemId] ??= []).push(reaction);
  }
  return byItem;
}

/** Upsert on the primary key — picking a new emoji overwrites the old one, re-reacting after un-reacting clears `deleted_at`. Same pattern as `setReaction`. */
export async function setVaultReaction(vaultItemId: string, emoji: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to react.");

  const { error } = await supabase
    .from("vault_reactions")
    .upsert(
      { vault_item_id: vaultItemId, user_id: user.id, emoji, deleted_at: null },
      { onConflict: "vault_item_id,user_id" },
    );

  if (error) throw error;
}

/** Soft delete — no DELETE policy exists to make a hard one with anyway. */
export async function clearVaultReaction(vaultItemId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to react.");

  const { error } = await supabase
    .from("vault_reactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("vault_item_id", vaultItemId)
    .eq("user_id", user.id);

  if (error) throw error;
}
