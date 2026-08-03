"use server";

import { revalidatePath } from "next/cache";
import { purgeItem, restoreItem } from "@/lib/bucket-list/mutations";
import { requireAdmin } from "@/lib/auth/admin";
import { purgeMemory, restoreMemory } from "@/lib/memories/mutations";
import { purgeVaultItem, restoreVaultItem } from "@/lib/vault/mutations";

/**
 * Both actions re-check `requireAdmin()` themselves rather than trusting that
 * only the archive page can reach them. A Server Action is a public endpoint —
 * the page-level check decides what's *rendered*, this decides what's allowed.
 * (`purgeMemory` checks again internally too; that redundancy is deliberate.)
 */

export async function restoreMemoryAction(id: string) {
  await requireAdmin();
  await restoreMemory(id);
  revalidatePath("/archive");
  revalidatePath("/");
}

/** Irreversible. See `purgeMemory` for why this exception to "no hard deletes" exists. */
export async function purgeMemoryAction(id: string) {
  await requireAdmin();
  await purgeMemory(id);
  revalidatePath("/archive");
}

/**
 * Bulk purge. Irreversible.
 *
 * Deliberately sequential rather than `Promise.all`: each purge does a storage
 * delete followed by a row delete, and running them concurrently makes a
 * partial failure much harder to reason about. It also reports how far it got,
 * so a failure halfway through a hundred photos says which ones are gone.
 */
export async function purgeMemoriesAction(
  ids: string[],
): Promise<{ purged: number; failed: string | null }> {
  await requireAdmin();

  let purged = 0;
  for (const id of ids) {
    try {
      await purgeMemory(id);
      purged += 1;
    } catch (caught) {
      revalidatePath("/archive");
      return {
        purged,
        failed: caught instanceof Error ? caught.message : "Something went wrong.",
      };
    }
  }

  revalidatePath("/archive");
  return { purged, failed: null };
}

/** The vault's copy of the three actions above, into the `vault` bucket instead of `memories`. */

export async function restoreVaultItemAction(id: string) {
  await requireAdmin();
  await restoreVaultItem(id);
  revalidatePath("/archive");
  revalidatePath("/vault");
}

/** Irreversible. See `purgeVaultItem` for why this exception to "no hard deletes" exists. */
export async function purgeVaultItemAction(id: string) {
  await requireAdmin();
  await purgeVaultItem(id);
  revalidatePath("/archive");
}

/** Bulk purge. Irreversible. Sequential — see `purgeMemoriesAction`'s comment for why. */
export async function purgeVaultItemsAction(
  ids: string[],
): Promise<{ purged: number; failed: string | null }> {
  await requireAdmin();

  let purged = 0;
  for (const id of ids) {
    try {
      await purgeVaultItem(id);
      purged += 1;
    } catch (caught) {
      revalidatePath("/archive");
      return {
        purged,
        failed: caught instanceof Error ? caught.message : "Something went wrong.",
      };
    }
  }

  revalidatePath("/archive");
  return { purged, failed: null };
}

/** The bucket list's copy of the three actions above, for `bucket_list_items` instead. */

export async function restoreBucketItemAction(id: string) {
  await requireAdmin();
  await restoreItem(id);
  revalidatePath("/archive");
  revalidatePath("/bucket-list");
}

/** Irreversible. See `purgeItem` for why this exception to "no hard deletes" exists. */
export async function purgeBucketItemAction(id: string) {
  await requireAdmin();
  await purgeItem(id);
  revalidatePath("/archive");
}

/** Bulk purge. Irreversible. Sequential — see `purgeMemoriesAction`'s comment for why. */
export async function purgeBucketItemsAction(
  ids: string[],
): Promise<{ purged: number; failed: string | null }> {
  await requireAdmin();

  let purged = 0;
  for (const id of ids) {
    try {
      await purgeItem(id);
      purged += 1;
    } catch (caught) {
      revalidatePath("/archive");
      return {
        purged,
        failed: caught instanceof Error ? caught.message : "Something went wrong.",
      };
    }
  }

  revalidatePath("/archive");
  return { purged, failed: null };
}
