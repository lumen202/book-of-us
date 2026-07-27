import { createClient } from "@/lib/supabase/server";

/**
 * Sets (or changes) the signed-in user's reaction on a memory.
 *
 * One row per (memory, user) — upserting on that primary key means picking a
 * new emoji after already having reacted just overwrites the old one rather
 * than stacking rows, and re-reacting after a soft-delete clears
 * `deleted_at` instead of inserting a duplicate.
 */
export async function setReaction(memoryId: string, emoji: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to react.");

  const { error } = await supabase
    .from("memory_reactions")
    .upsert(
      { memory_id: memoryId, user_id: user.id, emoji, deleted_at: null },
      { onConflict: "memory_id,user_id" },
    );

  if (error) throw error;
}

/**
 * Un-reacting. A soft delete, like everything else mutable in this schema —
 * see the "no hard deletes" invariant in `docs/agent/codebase-map/overview.md`.
 * There is no DELETE policy on `memory_reactions` to make one with anyway.
 */
export async function clearReaction(memoryId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to react.");

  const { error } = await supabase
    .from("memory_reactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("memory_id", memoryId)
    .eq("user_id", user.id);

  if (error) throw error;
}
