import { createClient } from "@/lib/supabase/server";
import type { Reaction } from "./types";

/**
 * Reactions for every memory on a page, in one round trip rather than one
 * query per print. Unlike `memories`, this isn't time-capsule-gated content,
 * so a direct table read is fine here — the "no raw memory reads" invariant
 * in `docs/agent/codebase-map/data-model.md` is specifically about the
 * `memories` table's own RPC-only read path, not every table that references it.
 */
export async function getReactionsForMemories(memoryIds: string[]): Promise<Reaction[]> {
  if (memoryIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_reactions")
    .select("memory_id, user_id, emoji")
    .in("memory_id", memoryIds)
    .is("deleted_at", null);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    memoryId: row.memory_id,
    userId: row.user_id,
    emoji: row.emoji,
  }));
}

/** Groups a flat reaction list by memory id — what the album page renders from. */
export function groupReactionsByMemory(reactions: Reaction[]): Record<string, Reaction[]> {
  const byMemory: Record<string, Reaction[]> = {};
  for (const reaction of reactions) {
    (byMemory[reaction.memoryId] ??= []).push(reaction);
  }
  return byMemory;
}
