import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { getVaultSignedUrl } from "./getVaultSignedUrl";
import { getReactionsForVaultItems, groupReactionsByVaultItem } from "./reactions";
import type { VaultItemView } from "./types";

export type DeletedVaultItem = {
  id: string;
  thumbnailUrl: string | null;
  createdAt: string;
  deletedAt: string;
};

/**
 * Only ever called after a successful re-auth in `unlockVault` — see that
 * action. Mints a thumbnail URL per item, not the full-size one; opening a
 * specific photo fetches that on demand (`getVaultItemFullUrl`), the same
 * "full is opt-in, skipped on the grid" cost-saving `resolveMemoryMedia`
 * already applies to the main book's chapter grids.
 */
export async function listVaultItems(): Promise<VaultItemView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_items")
    .select("id, title, storage_path, thumbnail_path, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  const reactionsByItem = groupReactionsByVaultItem(
    await getReactionsForVaultItems(data.map((row) => row.id as string)),
  );

  return Promise.all(
    data.map(async (row) => ({
      id: row.id as string,
      title: row.title as string | null,
      createdAt: row.created_at as string,
      storagePath: row.storage_path as string,
      thumbnailUrl: await getVaultSignedUrl(row.thumbnail_path as string, "thumb"),
      reactions: reactionsByItem[row.id as string] ?? [],
    })),
  );
}

/** Admin-only — the vault's copy of `listDeletedMemories`, for the Keeper's "Removed" page. */
export async function listDeletedVaultItems(): Promise<DeletedVaultItem[]> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_items")
    .select("id, thumbnail_path, created_at, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return Promise.all(
    data.map(async (row) => ({
      id: row.id as string,
      thumbnailUrl: await getVaultSignedUrl(row.thumbnail_path as string, "thumb"),
      createdAt: row.created_at as string,
      deletedAt: row.deleted_at as string,
    })),
  );
}
