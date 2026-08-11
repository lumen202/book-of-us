import { getAppNow } from "@/lib/relationship/devClock";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage/getSignedUrl";
import { filterEligibleChapters } from "./chapterEligibility";
import type { Memory } from "./types";

export { filterEligibleChapters } from "./chapterEligibility";

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
 * A kept bucket-list promise's whole album — the cover (also returned by
 * `getChapterMemories` for its chapter) and any additional photos, which have
 * no `chapter_id` and only surface here. See
 * `supabase/functions/get_chapter_memories.sql`'s `get_bucket_item_memories`.
 */
export async function getBucketItemMemories(bucketListItemId: string): Promise<Memory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_bucket_item_memories", {
    p_bucket_list_item_id: bucketListItemId,
  });

  if (error) throw error;
  return (data ?? []) as Memory[];
}

/**
 * Which of these bucket-list item ids have at least one photo — one batched
 * call for the whole list page, no signed URLs, no per-row query. Lets an
 * open (not-yet-kept) promise with a reference photo show a link without
 * reversing the list page's "zero images, zero per-row memory reads" cost
 * profile for everything that *doesn't* have one.
 */
export async function getBucketItemPhotoFlags(itemIds: string[]): Promise<Set<string>> {
  if (itemIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_bucket_item_photo_flags", {
    p_item_ids: itemIds,
  });

  if (error) throw error;
  return new Set(
    (data ?? []).map((row: { bucket_list_item_id: string }) => row.bucket_list_item_id),
  );
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

export type MemoryChapterLink = { memoryId: string; chapterSlug: string; chapterTitle: string };

/**
 * Where a set of memories live, for the bucket list's "there's a
 * photograph" link on a kept promise — see
 * `supabase/functions/get_chapter_memories.sql` for why this is its own RPC
 * rather than a raw `chapter_id` select: a locked or deleted memory must not
 * even have its existence confirmed by this lookup.
 */
export async function getMemoryChapterLinks(memoryIds: string[]): Promise<MemoryChapterLink[]> {
  if (memoryIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_memory_chapter_links", {
    p_memory_ids: memoryIds,
  });

  if (error) throw error;
  return (data ?? []).map(
    (row: { memory_id: string; chapter_slug: string; chapter_title: string }) => ({
      memoryId: row.memory_id,
      chapterSlug: row.chapter_slug,
      chapterTitle: row.chapter_title,
    }),
  );
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
 * The photographs from one chapter, for Celebration Mode's look back — a small
 * capped set of thumbnails, nothing else.
 *
 * Capped at `limit` deliberately. This runs on the home page, which every visit
 * hits and which has no business signing thirty URLs to build a slideshow
 * nobody watches to the end; six to eight prints is already longer than the
 * beat it plays in. Newest last so the sequence walks *toward* the present,
 * which is the direction a look back over a month wants to travel.
 *
 * Returns `[]` for a month with no photos in it — an early month, or one nobody
 * has filled in — and the ceremony skips its look-back beat rather than showing
 * an empty frame.
 */
export async function getChapterPrints(chapterId: string, limit = 7) {
  const photos = albumPrints(
    await resolveMemoryMedia(await getChapterMemories(chapterId), { full: false }),
  );

  return photos.slice(-limit).map((memory) => ({
    id: memory.id,
    // `albumPrints` has already guaranteed one of these resolved.
    url: (memory.thumbnailUrl ?? memory.mediaUrl) as string,
    title: memory.title,
    occurredAt: memory.occurred_at,
  }));
}

/**
 * Photographs for Celebration Mode's look back — last month's if there are
 * any, otherwise the most recent month before that which has some.
 *
 * **On a real celebration, never the current calendar month, even though
 * it's on the shelf by now.** Chapters are created and made visible on the
 * 1st (see `lib/chapters/queries.ts`), well before their own monthsary — so
 * on any given real 5th, the current month's chapter may already hold four
 * or five days of photos nobody has "finished" adding for the month yet.
 * Showing those in the same celebration that's supposed to be looking back
 * at *last* month would leak an in-progress month into a completed one. So
 * by default this skips whatever chapter matches `now`'s year/month before
 * looking for prints, regardless of what `chapters` contains.
 *
 * **`excludeCurrentMonth: false` for the dev/admin preview button.** That
 * button plays the ceremony on an arbitrary day, usually *before* a real
 * "last month" with photos exists — the entire point of previewing early is
 * to see photos just added to the current, in-progress month. Excluding it
 * there would make the preview show nothing (or a stale older month) instead
 * of what was actually just added, which defeats the button. The exclusion
 * exists to protect the automatic real celebration, not manual preview.
 *
 * The fallback past the current-month exclusion is the point of the rest of
 * the search. The ceremony's look-back beat is the emotional centre of the
 * 5th, and gating it on "did anyone add a photo last month" means it
 * silently disappears in exactly the months when the book has been quiet —
 * which are the months someone most needs to be shown that the thing is
 * still there. An older photograph is a far better answer than no beat at
 * all.
 *
 * Bounded to `depth` eligible chapters so a long-dormant book cannot turn one
 * page load into a walk back through years of empty months.
 *
 * `chapters` must be newest-first, which is what `listChapters()` returns.
 */
export async function findLookBackPrints(
  chapters: { id: string; month: string }[],
  depth = 4,
  { now = getAppNow(), excludeCurrentMonth = true }: { now?: Date; excludeCurrentMonth?: boolean } = {},
): Promise<Awaited<ReturnType<typeof getChapterPrints>>> {
  const eligible = filterEligibleChapters(chapters, now, excludeCurrentMonth);

  for (const chapter of eligible.slice(0, depth)) {
    const prints = await getChapterPrints(chapter.id);
    if (prints.length > 0) return prints;
  }
  return [];
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

/**
 * The full-size signed URL for one photo in a bucket-list promise's album —
 * same on-demand-at-lift reasoning as `getMemoryFullUrl`, going through
 * `getBucketItemMemories` instead of `getChapterMemories` since an album
 * photo beyond the cover has no `chapter_id` to look it up by.
 */
export async function getBucketItemMemoryFullUrl(
  bucketListItemId: string,
  memoryId: string,
): Promise<string | null> {
  const memory = (await getBucketItemMemories(bucketListItemId)).find(
    (row) => row.id === memoryId,
  );
  if (!memory?.storage_path) return null;
  return getSignedUrl(memory.storage_path, memory.type === "photo" ? "full" : undefined);
}
