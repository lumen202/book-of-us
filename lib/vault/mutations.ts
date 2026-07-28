import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type NewVaultItemInput = {
  /** Chosen client-side so the storage path can be built before the row exists — same convention as `createMemory`. */
  id: string;
  title: string | null;
  storagePath: string;
  thumbnailPath: string;
  meta?: Record<string, unknown>;
};

export async function insertVaultItem(input: NewVaultItemInput): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to add to the vault.");

  const { error } = await supabase.from("vault_items").insert({
    id: input.id,
    title: input.title,
    storage_path: input.storagePath,
    thumbnail_path: input.thumbnailPath,
    meta: input.meta ?? {},
    created_by: user.id,
  });

  if (error) throw error;
}

/** Soft delete — the item disappears from the vault grid immediately but is recoverable from the Keeper's "Removed" page, same as a memory. */
export async function softDeleteVaultItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vault_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw error;
}

/** Puts a soft-deleted vault item back. The inverse of the above — same pattern as `restoreMemory`. */
export async function restoreVaultItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vault_items")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null);

  if (error) throw error;
}

/**
 * Destroys a vault photo and its files for good. Admin only, irreversible —
 * the vault's copy of `purgeMemory`, into the `vault` bucket instead of
 * `memories`. Refuses to touch an item that hasn't been soft-deleted first.
 */
export async function purgeVaultItem(id: string): Promise<void> {
  await requireAdmin();

  const admin = createAdminClient();

  const { data: item, error: readError } = await admin
    .from("vault_items")
    .select("id, storage_path, thumbnail_path, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (readError) throw readError;
  if (!item) return;
  if (!item.deleted_at) {
    throw new Error("Only photos that are already removed can be deleted for good.");
  }

  const paths = [item.storage_path, item.thumbnail_path].filter(
    (path): path is string => Boolean(path),
  );
  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from("vault").remove(paths);
    if (storageError) throw storageError;
  }

  const { error: deleteError } = await admin.from("vault_items").delete().eq("id", id);
  if (deleteError) throw deleteError;
}
