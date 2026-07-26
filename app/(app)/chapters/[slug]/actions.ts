"use server";

import { revalidatePath } from "next/cache";
import { createMemory, softDeleteMemory, type NewMemoryInput } from "@/lib/memories/mutations";

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
