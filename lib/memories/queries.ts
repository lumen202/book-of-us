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

/**
 * Soft-deleted memories, newest removal first — the admin archive's contents.
 *
 * This is the one read that goes to the table directly instead of through
 * `get_chapter_memories`, because that RPC exists precisely to *exclude* these
 * rows; there is no way to ask it for them. It's still RLS-protected (the
 * select policy is "any signed-in user"), and it's still inside this file, so
 * the invariant that memory reads live here is intact.
 *
 * Callers must gate on `isCurrentUserAdmin()` — this function doesn't, so that
 * it stays a plain query rather than half a permission system.
 */
export async function listDeletedMemories(): Promise<Memory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Memory[];
}

export async function getAllMemories(): Promise<Memory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_all_memories");

  if (error) throw error;
  return (data ?? []) as Memory[];
}

/**
 * What the album page is allowed to show: photos that actually resolved to an
 * image. Other memory types (letters, notes, songs…) still exist in the schema
 * and are still stored and returned by the queries above — they just have no
 * designed place on the page yet, so they're filtered out here rather than
 * rendered as a placeholder card. When those types get their own treatment,
 * this is the single line that lets them back in.
 */
export function albumPrints(memories: MemoryWithMedia[]): MemoryWithMedia[] {
  return memories.filter(
    (memory) => memory.type === "photo" && (memory.thumbnailUrl ?? memory.mediaUrl),
  );
}

/**
 * Mints signed URLs for whichever media paths a memory actually has (private
 * bucket, so raw paths aren't renderable).
 *
 * Thumbnails are always images, so they're always requested at the small
 * `thumb` rendition. The main media is only resized for `photo` memories —
 * video and audio have no image transform, and asking for one would just cost
 * a wasted round trip before falling back to the original.
 *
 * ## `full` is opt-in, and the chapter page does not opt in
 *
 * Every signed URL is a round trip to Storage, so this function's cost is
 * `renditions × memories` — the one thing on the chapter page that grows with
 * how many photos are in a month, which is the direction this book only ever
 * goes. Signing the full-size URL for all of them up front doubled that to open
 * a page where all the reader can see is thumbnails, and paid it again for
 * every print they never lift.
 *
 * So the grid asks for thumbnails only, and `getMemoryFullUrl` signs one full
 * URL on demand when a print is actually lifted. The archive still asks for
 * both, because it lists deleted rows that may have no thumbnail at all.
 *
 * The full URL is also the one with the short shelf life: signatures last five
 * minutes, so one minted at page load for a print opened twenty minutes later
 * would have expired anyway. Signing it at the moment of opening is both the
 * cheaper and the more correct thing.
 */
export async function resolveMemoryMedia(
  memories: Memory[],
  { full = true }: { full?: boolean } = {},
): Promise<MemoryWithMedia[]> {
  return Promise.all(
    memories.map(async (memory) => {
      // Both requests at once. They were sequential — two serialised round
      // trips per memory, for two values that have nothing to do with each
      // other.
      const [thumbnailUrl, mediaUrl] = await Promise.all([
        memory.thumbnail_path ? getSignedUrl(memory.thumbnail_path, "thumb") : null,
        full && memory.storage_path
          ? getSignedUrl(memory.storage_path, memory.type === "photo" ? "full" : undefined)
          : null,
      ]);

      return { ...memory, thumbnailUrl, mediaUrl };
    }),
  );
}

/**
 * The full-size signed URL for one memory, minted when a print is lifted.
 *
 * Goes back through `getChapterMemories` rather than reading the row directly,
 * so a locked time-capsule can't have its media handed out by asking for it by
 * id — the "no raw memory reads" invariant in `data-model.md` is exactly about
 * this kind of side door.
 */
export async function getMemoryFullUrl(
  chapterId: string,
  memoryId: string,
): Promise<string | null> {
  const memory = (await getChapterMemories(chapterId)).find((row) => row.id === memoryId);
  if (!memory?.storage_path) return null;
  return getSignedUrl(memory.storage_path, memory.type === "photo" ? "full" : undefined);
}
