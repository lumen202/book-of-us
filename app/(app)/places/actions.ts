"use server";

import { revalidatePath } from "next/cache";
import { addItem } from "@/lib/bucket-list/mutations";
import type { BucketCategory } from "@/lib/bucket-list/types";
import { logPlaceShown, savePlace, unsavePlace } from "@/lib/places/journal/mutations";
import type { PlaceListKind, PlaceShownSource } from "@/lib/places/journal/types";
import { getPlaceBySlug } from "@/lib/places/source";
import type { PlaceCategory } from "@/lib/places/types";

/** Thin wrappers over `lib/places/journal/*` and `lib/bucket-list/mutations.ts` — see those for the actual writes. */

export async function toggleSavePlace(slug: string, list: PlaceListKind, save: boolean) {
  if (save) {
    await savePlace(slug, list);
  } else {
    await unsavePlace(slug, list);
  }
  revalidatePath("/places");
  revalidatePath(`/places/${slug}`);
}

export async function recordPlaceShown(slug: string, source: PlaceShownSource) {
  await logPlaceShown(slug, source);
}

/**
 * Which written-down category a destination's own categories map to closest
 * — `bucket_list_items.category` is a fixed set of 7 general life-promise
 * kinds (see `lib/bucket-list/types.ts`), not the atlas's 20 travel-specific
 * ones, so this is a many-to-one narrowing, not a lossless conversion.
 */
function toBucketCategory(categories: readonly PlaceCategory[]): BucketCategory {
  if (categories.includes("food")) return "food";
  if (categories.some((c) => ["church", "historical", "museum"].includes(c))) return "travel";
  return categories.some((c) =>
    ["adventure", "hiking", "camping", "surfing", "diving", "cave", "mountain"].includes(c),
  )
    ? "adventure"
    : "travel";
}

/**
 * "We should go here" — turns a destination into a promise on the shared
 * bucket list, same table and same page as every other kept-or-not promise
 * in the book (see `docs/agent/codebase-map/bucket-list.md`). Deliberately
 * doesn't attach a reference photo: the atlas's own hero image belongs to
 * Wikimedia under its own licence, not to this couple, and the bucket list's
 * "picturing this" photo slot is for a photo *they* chose.
 */
export async function addPlaceToBucketList(slug: string) {
  const place = getPlaceBySlug(slug);
  if (!place) throw new Error("That destination isn't in the atlas anymore.");

  await addItem({
    title: place.name,
    category: toBucketCategory(place.category),
    note: place.note,
  });
  revalidatePath("/bucket-list");
}
