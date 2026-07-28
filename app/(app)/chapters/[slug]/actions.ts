"use server";

import { revalidatePath } from "next/cache";
import { addComment as writeComment, removeComment as deleteComment } from "@/lib/comments/mutations";
import { createMemory, softDeleteMemory, type NewMemoryInput } from "@/lib/memories/mutations";
import { getMemoryFullUrl } from "@/lib/memories/queries";
import { clearReaction, setReaction } from "@/lib/reactions/mutations";

/**
 * Thin wrapper: the actual write lives in `lib/memories/mutations.ts`. This
 * exists only to expose it as a Server Action and to refresh the chapter page
 * afterwards, so the new print is on the album page when the composer closes.
 */
export async function addMemory(input: NewMemoryInput & { chapterSlug: string }) {
  const { chapterSlug, ...memory } = input;
  await createMemory(memory);
  revalidatePath(`/chapters/${chapterSlug}`);
  revalidatePath("/");
}

/** Soft delete — see `softDeleteMemory`. Nothing is destroyed here. */
export async function removeMemory(id: string, chapterSlug: string) {
  await softDeleteMemory(id);
  revalidatePath(`/chapters/${chapterSlug}`);
  revalidatePath("/");
}

/**
 * The full-size signed URL for one print, asked for at the moment it is lifted.
 *
 * The chapter page signs thumbnails only — see the note on `resolveMemoryMedia`
 * for why. This is a read, not a mutation, so there is nothing to revalidate;
 * it is a Server Action purely because it has to run somewhere with the
 * Storage client and the user's session, and a client component is the thing
 * that knows when a print has been opened.
 */
export async function loadMemoryFullUrl(chapterId: string, memoryId: string) {
  return getMemoryFullUrl(chapterId, memoryId);
}

/** Sets or changes the signed-in user's reaction on a memory. */
export async function reactToMemory(memoryId: string, emoji: string, chapterSlug: string) {
  await setReaction(memoryId, emoji);
  revalidatePath(`/chapters/${chapterSlug}`);
}

/** Removes the signed-in user's reaction — see `clearReaction`. */
export async function unreactToMemory(memoryId: string, chapterSlug: string) {
  await clearReaction(memoryId);
  revalidatePath(`/chapters/${chapterSlug}`);
}

/** Leaves a note on a memory. */
export async function addComment(memoryId: string, body: string, chapterSlug: string) {
  await writeComment(memoryId, body);
  revalidatePath(`/chapters/${chapterSlug}`);
}

/** Soft delete — see `removeComment` in `lib/comments/mutations.ts`. */
export async function removeMemoryComment(commentId: string, chapterSlug: string) {
  await deleteComment(commentId);
  revalidatePath(`/chapters/${chapterSlug}`);
}
