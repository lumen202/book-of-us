import { createClient } from "@/lib/supabase/server";
import type { Chapter } from "./types";

/**
 * Chapters have no time-capsule concept of their own (only individual
 * memories lock/unlock), so a plain RLS-protected select is fine here —
 * unlike lib/memories/queries.ts, which must go through an RPC.
 */

export async function listChapters(): Promise<Chapter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .is("deleted_at", null)
    .order("month", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Chapter[];
}

export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Chapter | null;
}
