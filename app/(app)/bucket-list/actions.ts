"use server";

import { revalidatePath } from "next/cache";
import {
  addItem,
  attachMemoryToItem,
  completeItem,
  removeItem,
  renameItem,
  reopenItem,
  type CompletionPhoto,
} from "@/lib/bucket-list/mutations";
import type { BucketCategory } from "@/lib/bucket-list/types";
import { resolveTargetChapter } from "@/lib/chapters/queries";

/** Thin wrappers over `lib/bucket-list/mutations.ts` — see that file for the actual writes. */

export async function addPromise(input: {
  title: string;
  category: BucketCategory;
  note?: string | null;
}) {
  await addItem(input);
  revalidatePath("/bucket-list");
}

export async function editPromise(
  id: string,
  updates: { title?: string; note?: string | null; category?: BucketCategory },
) {
  await renameItem(id, updates);
  revalidatePath("/bucket-list");
}

export async function removePromise(id: string) {
  await removeItem(id);
  revalidatePath("/bucket-list");
}

export async function reopenPromise(id: string) {
  await reopenItem(id);
  revalidatePath("/bucket-list");
}

/**
 * Called before a completion photo is uploaded, so the browser knows which
 * chapter's folder to put it in — see `resolveTargetChapter` for why this
 * can't just be "the current month" and has to be resolved on the server.
 */
export async function resolveChapterForCompletion() {
  const chapter = await resolveTargetChapter();
  return { id: chapter.id, slug: chapter.slug, title: chapter.title };
}

export async function keepPromise(input: {
  itemId: string;
  occurredAt: string;
  note: string;
  photo: (CompletionPhoto & { chapterSlug: string }) | null;
}) {
  const { photo, ...rest } = input;
  await completeItem({ ...rest, photo });
  revalidatePath("/bucket-list");
  if (photo) revalidatePath(`/chapters/${photo.chapterSlug}`);
}

export async function attachPromiseMemory(input: {
  itemId: string;
  occurredAt: string;
  note: string;
  photo: CompletionPhoto & { chapterSlug: string };
}) {
  const { photo, ...rest } = input;
  await attachMemoryToItem({ ...rest, photo });
  revalidatePath("/bucket-list");
  revalidatePath(`/chapters/${photo.chapterSlug}`);
}
