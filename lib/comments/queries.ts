import { createClient } from "@/lib/supabase/server";
import type { Comment } from "./types";

/**
 * Notes for every memory on a page, in one round trip. Like
 * `lib/reactions/queries.ts`, this reads the table directly rather than
 * through an RPC — notes aren't time-capsule-gated content, so the
 * "no raw memory reads" invariant (scoped to the `memories` table's own read
 * path) doesn't apply here.
 */
export async function getCommentsForMemories(memoryIds: string[]): Promise<Comment[]> {
  if (memoryIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_comments")
    .select("id, memory_id, user_id, body, created_at")
    .in("memory_id", memoryIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    memoryId: row.memory_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
  }));
}

/** Groups a flat comment list by memory id — what the album page renders from. */
export function groupCommentsByMemory(comments: Comment[]): Record<string, Comment[]> {
  const byMemory: Record<string, Comment[]> = {};
  for (const comment of comments) {
    (byMemory[comment.memoryId] ??= []).push(comment);
  }
  return byMemory;
}
