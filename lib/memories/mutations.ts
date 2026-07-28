import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MemoryType } from "./types";

export type NewMemoryInput = {
  /** Chosen by the client so the storage paths can be built before the row exists. */
  id: string;
  chapterId: string;
  type: MemoryType;
  title: string;
  body: string | null;
  /** Date-only, `YYYY-MM-DD`. */
  occurredAt: string;
  storagePath: string | null;
  thumbnailPath: string | null;
  meta?: Record<string, unknown>;
};

/**
 * The only writer of memory rows.
 *
 * Media is already in the bucket by the time this runs — the browser uploads
 * it directly (see `components/memory/MemoryComposer.tsx`) and passes the
 * paths here. That's why `id` comes in rather than being defaulted by
 * Postgres: the upload path convention is
 * `chapters/{chapterId}/{memoryId}/…`, so the id has to exist before either
 * the file or the row does. A caller-supplied uuid is safe here because a
 * collision fails on the primary key rather than overwriting anything, and
 * RLS still gates the insert.
 */
export async function createMemory(input: NewMemoryInput): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to add a memory.");

  const { error } = await supabase.from("memories").insert({
    id: input.id,
    chapter_id: input.chapterId,
    type: input.type,
    title: input.title,
    body: input.body,
    occurred_at: input.occurredAt,
    storage_path: input.storagePath,
    thumbnail_path: input.thumbnailPath,
    meta: input.meta ?? {},
    created_by: user.id,
  });

  if (error) throw error;
}

/**
 * Editing a print's caption after the fact.
 *
 * Unlike `editComment`, there's no "mine" restriction here: a caption is a
 * shared label on a shared print, the same way removing a print isn't
 * restricted to whoever added it (see `MemoryCard`'s always-visible ×).
 * `title` is `not null` in the schema, so an attempt to blank it is refused
 * here rather than silently falling back to a placeholder.
 */
export async function updateMemoryCaption(id: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("A caption can't be blank.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("memories")
    .update({ title: trimmed })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw error;
}

/**
 * Removing a print from the album.
 *
 * A soft delete, always — `deleted_at` is stamped and `get_chapter_memories`
 * stops returning the row. There is no hard-delete path and there is no DELETE
 * RLS policy on `memories` to make one with (see `0001_init.sql`); the row and
 * its files stay recoverable. This is a shared book where the other person's
 * photo is one misclick away, so "gone from the page" and "gone forever" must
 * not be the same action.
 *
 * The Storage objects are deliberately left in place. Reaping them belongs to
 * the service-role cleanup script, not to a click in the UI.
 */
export async function softDeleteMemory(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("memories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw error;
}

/** Puts a soft-deleted memory back on its page. The inverse of the above. */
export async function restoreMemory(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("memories")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null);

  if (error) throw error;
}

/**
 * Destroys a memory and its files for good. Admin only, irreversible.
 *
 * **This is the one deliberate exception to the "no hard deletes" invariant**
 * in `docs/agent/codebase-map/overview.md`. The invariant still holds for the
 * whole app — nothing else anywhere issues a DELETE, and the app's own role
 * *cannot*, because `memories` has no DELETE policy. Only this function, only
 * behind `requireAdmin()`, and only through the service-role client, can do
 * it. That's what keeps "emptying the trash" a decision someone makes on
 * purpose rather than a click anyone can reach.
 *
 * Order matters: storage objects first, then the row. If the storage call
 * fails the row survives and the whole thing can be retried; doing it the
 * other way round would strand files in the bucket with nothing pointing at
 * them.
 *
 * Refuses to touch a memory that hasn't been soft-deleted first, so this can
 * never be a one-step delete.
 */
export async function purgeMemory(id: string): Promise<void> {
  await requireAdmin();

  const admin = createAdminClient();

  const { data: memory, error: readError } = await admin
    .from("memories")
    .select("id, storage_path, thumbnail_path, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (readError) throw readError;
  if (!memory) return;
  if (!memory.deleted_at) {
    throw new Error("Only memories that are already removed can be deleted for good.");
  }

  const paths = [memory.storage_path, memory.thumbnail_path].filter(
    (path): path is string => Boolean(path),
  );
  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from("memories").remove(paths);
    if (storageError) throw storageError;
  }

  const { error: deleteError } = await admin.from("memories").delete().eq("id", id);
  if (deleteError) throw deleteError;
}
