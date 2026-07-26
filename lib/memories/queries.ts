import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage/getSignedUrl";
import type { Memory } from "./types";

export type MemoryWithMedia = Memory & {
  thumbnailUrl: string | null;
  mediaUrl: string | null;
};

/**
 * The only two functions in the app that read memory rows. Both call a
 * Postgres RPC (not a raw table select) because locked time-capsules can't
 * be filtered out cleanly via RLS alone — see
 * docs/agent/codebase-map/data-model.md. Never add a direct
 * `.from("memories")` read anywhere else.
 */

export async function getChapterMemories(chapterId: string): Promise<Memory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_chapter_memories", {
    p_chapter_id: chapterId,
  });

  if (error) throw error;
  return (data ?? []) as Memory[];
}

export async function getAllMemories(): Promise<Memory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_all_memories");

  if (error) throw error;
  return (data ?? []) as Memory[];
}

/** Mints signed URLs for whichever media paths a memory actually has (private bucket, so raw paths aren't renderable). */
export async function resolveMemoryMedia(memories: Memory[]): Promise<MemoryWithMedia[]> {
  return Promise.all(
    memories.map(async (memory) => ({
      ...memory,
      thumbnailUrl: memory.thumbnail_path ? await getSignedUrl(memory.thumbnail_path) : null,
      mediaUrl: memory.storage_path ? await getSignedUrl(memory.storage_path) : null,
    })),
  );
}
