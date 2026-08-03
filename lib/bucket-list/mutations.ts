import { createMemory } from "@/lib/memories/mutations";
import { createClient } from "@/lib/supabase/server";
import type { BucketCategory } from "./types";

/** Postgres unique-violation code — see the retry note in `completeItem`. */
function isDuplicateKeyError(caught: unknown): boolean {
  return (
    typeof caught === "object" &&
    caught !== null &&
    "code" in caught &&
    (caught as { code?: unknown }).code === "23505"
  );
}

/** Everything `uploadMemoryMedia` already produced, plus the chapter it was uploaded into. */
export type CompletionPhoto = {
  chapterId: string;
  memoryId: string;
  storagePath: string;
  thumbnailPath: string;
  meta: Record<string, unknown>;
};

/**
 * Adding a promise — see `components/bucket-list/AddPromiseModal.tsx`.
 * New promises go to the end of the open list.
 *
 * `id` is optional and client-supplied — same reason `createMemory` takes
 * one (`lib/memories/mutations.ts`): when the add modal has a reference
 * photo to attach too, the client needs the new row's id *before* the row
 * exists, to build the upload's storage path and to tag the photo with
 * `bucketListItemId`. Omitted, Postgres defaults it as before.
 */
export async function addItem(input: {
  id?: string;
  title: string;
  category: BucketCategory;
  note?: string | null;
}): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error("Write the promise first.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to add a promise.");

  const { data: last, error: lastError } = await supabase
    .from("bucket_list_items")
    .select("position")
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;
  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase.from("bucket_list_items").insert({
    ...(input.id ? { id: input.id } : {}),
    title,
    category: input.category,
    note: input.note?.trim() || null,
    position,
    created_by: user.id,
  });
  if (error) throw error;
}

/** Editing a promise's text, note or category — the long-press-to-edit path. */
export async function renameItem(
  id: string,
  updates: { title?: string; note?: string | null; category?: BucketCategory },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) {
    const trimmed = updates.title.trim();
    if (!trimmed) throw new Error("A promise needs words.");
    patch.title = trimmed;
  }
  if (updates.note !== undefined) patch.note = updates.note?.trim() || null;
  if (updates.category !== undefined) patch.category = updates.category;
  if (Object.keys(patch).length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("bucket_list_items")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw error;
}

/**
 * Removing a promise entirely. Soft delete, like everything else — see the
 * "no hard deletes" invariant in `docs/agent/codebase-map/overview.md`. Its
 * linked memory, if any, is untouched: removing the promise is not removing
 * the print.
 */
export async function removeItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bucket_list_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw error;
}

/**
 * Writes the memory (if there's a photo) and links it to the item, guarding
 * against the same write happening twice.
 *
 * Shared by `completeItem` and `attachMemoryToItem` — they differ only in
 * which item states they're allowed to act on, not in how the link itself is
 * made.
 *
 * **The duplicate-key catch is deliberate.** `createMemory` is given a
 * client-generated id so the storage path can exist before the row does. If
 * the memory write above succeeds but this function's own update below then
 * fails (network blip, tab closed), the item is left open with an orphaned
 * memory sitting in the chapter. A retry from the client reuses that same
 * memory id — see `CompletionModal`'s `memoryId` state — so `createMemory`
 * fails on the primary key rather than writing a second print; the failure
 * is swallowed here and the function falls through to linking the row that
 * already exists.
 */
async function writeLinkedMemory(
  itemId: string,
  fallbackTitle: string,
  input: { occurredAt: string; note: string; photo: CompletionPhoto | null },
): Promise<void> {
  const supabase = await createClient();

  if (input.photo) {
    try {
      await createMemory({
        id: input.photo.memoryId,
        chapterId: input.photo.chapterId,
        type: "photo",
        title: input.note.trim() || fallbackTitle,
        body: null,
        occurredAt: input.occurredAt,
        storagePath: input.photo.storagePath,
        thumbnailPath: input.photo.thumbnailPath,
        meta: input.photo.meta,
        // Tags the cover as part of this promise's album too, so
        // `getBucketItemMemories` finds it alongside any photos added later
        // via `addAlbumPhoto` — see BUG/plan note in
        // docs/agent/codebase-map/bucket-list.md.
        bucketListItemId: itemId,
      });
    } catch (caught) {
      if (!isDuplicateKeyError(caught)) throw caught;
    }
  }

  // Guarded on `memory_id is null` at the database, not just checked in
  // React state first — two completions racing the same item (a double-tap,
  // or two devices) must produce at most one link. The loser's update
  // becomes a harmless no-op here rather than a second memory row.
  const { error } = await supabase
    .from("bucket_list_items")
    .update({
      status: "done",
      completed_at: input.occurredAt,
      memory_id: input.photo?.memoryId ?? null,
    })
    .eq("id", itemId)
    .is("memory_id", null);
  if (error) throw error;
}

/**
 * Ticking a promise. Fully supported with no photo (§3.5 in the plan) —
 * `memory_id` simply stays null, no memory row, no storage write. The
 * caller decides which chapter a photo lands in beforehand (see
 * `resolveChapterForCompletion` in `app/(app)/bucket-list/actions.ts`) and
 * uploads it there via `uploadMemoryMedia` before calling this.
 */
export async function completeItem(input: {
  itemId: string;
  occurredAt: string;
  note: string;
  photo: CompletionPhoto | null;
}): Promise<void> {
  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("bucket_list_items")
    .select("id, title, memory_id")
    .eq("id", input.itemId)
    .is("deleted_at", null)
    .maybeSingle();
  if (itemError) throw itemError;
  if (!item) throw new Error("That promise isn't there anymore.");
  if (item.memory_id) return; // already kept — a retry or a double-tap, not a second memory

  await writeLinkedMemory(item.id, item.title, input);
}

/**
 * Un-ticking a kept promise. Never deletes the memory — the print stays in
 * the album, because an accidental tick must not be able to take a real
 * photograph off the page. If the print itself needs to go, that's the
 * album's own remove flow, a separate and deliberate action.
 */
export async function reopenItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bucket_list_items")
    .update({ status: "open", completed_at: null })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw error;
}

/**
 * The photo-later path (§3.5): a promise kept with no print at the time can
 * have one attached afterwards, back-filling `memory_id`. Refuses to touch
 * an item that already has one — this is additive, not a replace.
 */
export async function attachMemoryToItem(input: {
  itemId: string;
  occurredAt: string;
  note: string;
  photo: CompletionPhoto;
}): Promise<void> {
  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("bucket_list_items")
    .select("id, title, memory_id")
    .eq("id", input.itemId)
    .is("deleted_at", null)
    .maybeSingle();
  if (itemError) throw itemError;
  if (!item) throw new Error("That promise isn't there anymore.");
  if (item.memory_id) return; // already has a print

  await writeLinkedMemory(item.id, item.title, input);
}

/**
 * Adding another photo to an already-kept promise's album — unlike
 * `attachMemoryToItem`, this never touches `bucket_list_items.memory_id` (the
 * cover pointer) and can be called any number of times. `chapterId` is
 * deliberately not set on the memory this writes: an album photo beyond the
 * cover never files into a chapter's flat grid, only into this promise's own
 * album page (`getBucketItemMemories`) — see
 * `docs/agent/codebase-map/bucket-list.md`.
 *
 * Same retry-safety idea as `writeLinkedMemory`: the caller reuses one
 * client-generated `memoryId` across retries, so a duplicate-key error here
 * means this exact photo was already written and the call is a harmless
 * no-op rather than a second copy.
 */
export async function addAlbumPhoto(input: {
  itemId: string;
  occurredAt: string;
  note: string;
  photo: CompletionPhoto;
}): Promise<void> {
  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("bucket_list_items")
    .select("id, title")
    .eq("id", input.itemId)
    .is("deleted_at", null)
    .maybeSingle();
  if (itemError) throw itemError;
  if (!item) throw new Error("That promise isn't there anymore.");

  try {
    await createMemory({
      id: input.photo.memoryId,
      chapterId: null,
      type: "photo",
      title: input.note.trim() || item.title,
      body: null,
      occurredAt: input.occurredAt,
      storagePath: input.photo.storagePath,
      thumbnailPath: input.photo.thumbnailPath,
      meta: input.photo.meta,
      bucketListItemId: item.id,
    });
  } catch (caught) {
    if (!isDuplicateKeyError(caught)) throw caught;
  }
}
