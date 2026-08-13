"use server";

import { revalidatePath } from "next/cache";
import { createTrip } from "@/lib/trips/mutations";
import {
  addComment as writeComment,
  editComment as editCommentBody,
  removeComment as deleteComment,
} from "@/lib/comments/mutations";
import {
  setResurfaceExcluded,
  softDeleteMemory,
  updateMemoryCaption,
} from "@/lib/memories/mutations";
import { getTripMemories } from "@/lib/memories/queries";
import { getSignedUrl } from "@/lib/storage/getSignedUrl";
import { clearReaction, setReaction } from "@/lib/reactions/mutations";

/** Starting a trip from the composer — see `MemoryComposer`'s "part of a trip?" control. */
export async function startTrip(input: { id: string; title: string; chapterSlug: string }) {
  await createTrip({ id: input.id, title: input.title });
  revalidatePath(`/chapters/${input.chapterSlug}`);
  revalidatePath("/trips");
}

/**
 * The trip page's copy of `app/(app)/chapters/[slug]/actions.ts`'s action
 * set — same underlying `lib/` mutations, just revalidating `/trips/[id]`
 * instead of a chapter. `MemoryGrid` binds whichever set matches its
 * `context` prop, same as it already does for `kind: "album"`.
 */

export async function loadTripMemoryFullUrl(tripId: string, memoryId: string) {
  const memory = (await getTripMemories(tripId)).find((row) => row.id === memoryId);
  if (!memory?.storage_path) return null;
  return getSignedUrl(memory.storage_path, memory.type === "photo" ? "full" : undefined);
}

export async function removeTripMemory(memoryId: string, tripId: string) {
  await softDeleteMemory(memoryId);
  revalidatePath(`/trips/${tripId}`);
}

export async function reactToTripPhoto(memoryId: string, emoji: string, tripId: string) {
  await setReaction(memoryId, emoji);
  revalidatePath(`/trips/${tripId}`);
}

export async function unreactToTripPhoto(memoryId: string, tripId: string) {
  await clearReaction(memoryId);
  revalidatePath(`/trips/${tripId}`);
}

export async function addTripComment(memoryId: string, body: string, tripId: string) {
  await writeComment(memoryId, body);
  revalidatePath(`/trips/${tripId}`);
}

export async function removeTripComment(commentId: string, tripId: string) {
  await deleteComment(commentId);
  revalidatePath(`/trips/${tripId}`);
}

export async function editTripComment(commentId: string, body: string, tripId: string) {
  await editCommentBody(commentId, body);
  revalidatePath(`/trips/${tripId}`);
}

export async function editTripMemoryCaption(id: string, title: string, tripId: string) {
  await updateMemoryCaption(id, title);
  revalidatePath(`/trips/${tripId}`);
}

export async function toggleTripMemoryResurface(id: string, excluded: boolean, tripId: string) {
  await setResurfaceExcluded(id, excluded);
  revalidatePath(`/trips/${tripId}`);
}
