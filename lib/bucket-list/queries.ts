import { createClient } from "@/lib/supabase/server";
import type { BucketListItem } from "./types";

/**
 * Reads go straight to the table rather than through an RPC, and that's
 * consistent with the rest of the schema, not a shortcut around it: the
 * "no raw reads" rule in `docs/agent/codebase-map/data-model.md` is scoped to
 * `memories` specifically, because that table carries time-capsule gating.
 * `memory_reactions` and `memory_comments` already read their tables directly
 * for the same reason — bucket list items have no unlock semantics either.
 */
function toItem(row: {
  id: string;
  title: string;
  note: string | null;
  category: string;
  status: string;
  position: number;
  completed_at: string | null;
  memory_id: string | null;
  cover_memory_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}): BucketListItem {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    category: row.category as BucketListItem["category"],
    status: row.status as BucketListItem["status"],
    position: row.position,
    completedAt: row.completed_at,
    memoryId: row.memory_id,
    coverMemoryId: row.cover_memory_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** Every promise, open first by position then kept ones — the page sorts them into its two sections. */
export async function listBucketItems(): Promise<BucketListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bucket_list_items")
    .select("*")
    .is("deleted_at", null)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toItem);
}

/** One promise, for its album page — `null` if it's gone (the page 404s). */
export async function getBucketItem(id: string): Promise<BucketListItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bucket_list_items")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data ? toItem(data) : null;
}

/**
 * Removed promises, newest removal first — the archive's contents. A
 * removed promise's album page 404s (`getBucketItem` filters it out), same
 * as a removed memory's own page would; this is the way back to it, put
 * back or deleted for good, same as `listDeletedMemories`.
 */
export async function listDeletedBucketItems(): Promise<BucketListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bucket_list_items")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toItem);
}
