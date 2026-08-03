"use server";

import { revalidatePath } from "next/cache";
import {
  addAlbumPhoto,
  addItem,
  attachMemoryToItem,
  completeItem,
  removeItem,
  renameItem,
  reopenItem,
  type CompletionPhoto,
} from "@/lib/bucket-list/mutations";
import type { BucketCategory } from "@/lib/bucket-list/types";
import { addComment as writeComment, editComment as editCommentBody, removeComment as deleteComment } from "@/lib/comments/mutations";
import { resolveTargetChapter } from "@/lib/chapters/queries";
import { softDeleteMemory, updateMemoryCaption } from "@/lib/memories/mutations";
import { getBucketItemMemoryFullUrl } from "@/lib/memories/queries";
import { clearReaction, setReaction } from "@/lib/reactions/mutations";

/** Thin wrappers over `lib/bucket-list/mutations.ts` — see that file for the actual writes. */

export async function addPromise(input: {
  id?: string;
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

/**
 * Adding another photo to an already-kept promise's album — the
 * `chapterSlug` in `photo` is only there because `CompletionPhoto` carries it
 * for the storage path's folder convention; unlike `keepPromise`/
 * `attachPromiseMemory`, no chapter page needs revalidating, since this photo
 * never appears on one.
 */
export async function addPromiseAlbumPhoto(input: {
  itemId: string;
  occurredAt: string;
  note: string;
  photo: CompletionPhoto;
}) {
  await addAlbumPhoto(input);
  revalidatePath(`/bucket-list/${input.itemId}`);
}

/** The album grid asks for thumbnails only; this signs one full-size URL when a photo is lifted. */
export async function loadPromiseAlbumFullUrl(itemId: string, memoryId: string) {
  return getBucketItemMemoryFullUrl(itemId, memoryId);
}

/**
 * The album's copy of `app/(app)/chapters/[slug]/actions.ts`'s reaction/
 * comment/remove/caption actions — same underlying `lib/` mutations
 * (reactions and comments were never chapter-specific to begin with), just
 * revalidating `/bucket-list/[id]` instead of a chapter. `MemoryGrid` binds
 * whichever set matches its `context` prop.
 */

export async function reactToAlbumPhoto(memoryId: string, emoji: string, itemId: string) {
  await setReaction(memoryId, emoji);
  revalidatePath(`/bucket-list/${itemId}`);
}

export async function unreactToAlbumPhoto(memoryId: string, itemId: string) {
  await clearReaction(memoryId);
  revalidatePath(`/bucket-list/${itemId}`);
}

export async function addAlbumComment(memoryId: string, body: string, itemId: string) {
  await writeComment(memoryId, body);
  revalidatePath(`/bucket-list/${itemId}`);
}

export async function removeAlbumComment(commentId: string, itemId: string) {
  await deleteComment(commentId);
  revalidatePath(`/bucket-list/${itemId}`);
}

export async function editAlbumComment(commentId: string, body: string, itemId: string) {
  await editCommentBody(commentId, body);
  revalidatePath(`/bucket-list/${itemId}`);
}

/** Soft delete — a photo taken out of an album, not the promise itself. */
export async function removeAlbumMemory(memoryId: string, itemId: string) {
  await softDeleteMemory(memoryId);
  revalidatePath(`/bucket-list/${itemId}`);
}

export async function editAlbumMemoryCaption(id: string, title: string, itemId: string) {
  await updateMemoryCaption(id, title);
  revalidatePath(`/bucket-list/${itemId}`);
}
