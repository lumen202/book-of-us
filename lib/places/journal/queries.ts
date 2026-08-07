import { createClient } from "@/lib/supabase/server";
import type { PlaceListKind, PlaceSave, PlaceShownEntry, PlaceShownSource } from "./types";

/**
 * Every save (wishlist or visited), shared-book-wide — like every other
 * table in this schema, this isn't per-user-private data, so both accounts
 * see both of your saves. Not time-capsule-gated content, so a direct table
 * read is fine — same reasoning as `lib/reactions/queries.ts`.
 */
export async function getAllSaves(): Promise<PlaceSave[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_saves")
    .select("place_slug, user_id, list")
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    placeSlug: row.place_slug,
    userId: row.user_id,
    list: row.list as PlaceListKind,
  }));
}

/**
 * Slugs saved by *either* of you — "we want to go" / "we've been", read as a
 * shared list the same way the bucket list is one shared list, not two
 * private ones. One consequence worth knowing: if both of you independently
 * saved the same place and only one un-saves, it still shows saved — because
 * the other's row is still there and still true. That's intentional, not a
 * bug: it's still on the list because the other one of you still wants it.
 */
export async function getSavedSlugs(list: PlaceListKind): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_saves")
    .select("place_slug")
    .eq("list", list)
    .is("deleted_at", null);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.place_slug));
}

/**
 * Slugs shown to *this* signed-in user within the last `days` — what the
 * recommendation engine (`lib/places/engine.ts`) excludes before picking, so
 * Surprise Me/the wheel/Lucky Draw don't repeat themselves inside one
 * stretch of visits. Scoped to the current user (not shared) on purpose: the
 * two of you opening the book on the same evening shouldn't each get
 * pre-filtered by what the other was just shown.
 */
export async function getRecentlyShownSlugs(days = 14): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("place_shown_log")
    .select("place_slug")
    .eq("user_id", user.id)
    .gte("shown_at", since);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.place_slug));
}

/** The most recent distinct places this user has actually opened (`view` entries) — "Recently viewed". */
export async function getRecentlyViewed(limit = 8): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("place_shown_log")
    .select("place_slug, shown_at")
    .eq("user_id", user.id)
    .eq("source", "view" satisfies PlaceShownSource)
    .order("shown_at", { ascending: false })
    .limit(limit * 3); // over-fetch to dedupe down to `limit` distinct places
  if (error) throw error;

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.place_slug)) continue;
    seen.add(row.place_slug);
    ordered.push(row.place_slug);
    if (ordered.length >= limit) break;
  }
  return ordered;
}

export type { PlaceSave, PlaceShownEntry };
