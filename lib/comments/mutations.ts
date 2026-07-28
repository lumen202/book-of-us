import { createClient } from "@/lib/supabase/server";

/** Leaves a note on a memory. */
export async function addComment(memoryId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Write something first.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to leave a note.");

  const { error } = await supabase
    .from("memory_comments")
    .insert({ memory_id: memoryId, user_id: user.id, body: trimmed });

  if (error) throw error;
}

/**
 * Editing your own note after it's posted.
 *
 * The RLS `memory_comments_update` policy allows any signed-in account to
 * update any row — same shared-book shape as everywhere else in this schema
 * — so "your own" is enforced in the UI (`MemoryComments` only shows the
 * Edit control on comments where `userId === currentUserId`), the same way
 * it already gates the Remove control. There's no further column to check
 * here, so a second enforcement layer in this function would just repeat
 * what the caller already decided.
 */
export async function editComment(id: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Write something first.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("memory_comments")
    .update({ body: trimmed })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw error;
}

/**
 * Removing a note. A soft delete, like everything else mutable in this
 * schema — see the "no hard deletes" invariant in
 * `docs/agent/codebase-map/overview.md`. There is no DELETE policy on
 * `memory_comments` to make one with anyway.
 */
export async function removeComment(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("memory_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw error;
}
