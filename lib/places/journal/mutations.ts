import { createClient } from "@/lib/supabase/server";
import type { PlaceListKind, PlaceShownSource } from "./types";

/**
 * Saving a place to the wishlist or marking it visited. Upserts on the
 * primary key `(place_slug, user_id, list)` — same shape as
 * `lib/reactions/mutations.ts`'s `setReaction`: re-saving after an
 * un-save clears `deleted_at` instead of inserting a duplicate row.
 */
export async function savePlace(placeSlug: string, list: PlaceListKind): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to save a place.");

  const { error } = await supabase
    .from("place_saves")
    .upsert(
      { place_slug: placeSlug, user_id: user.id, list, deleted_at: null },
      { onConflict: "place_slug,user_id,list" },
    );
  if (error) throw error;
}

/** Un-saving. Soft delete — see the "no hard deletes" invariant in `docs/agent/codebase-map/overview.md`. */
export async function unsavePlace(placeSlug: string, list: PlaceListKind): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to change a save.");

  const { error } = await supabase
    .from("place_saves")
    .update({ deleted_at: new Date().toISOString() })
    .eq("place_slug", placeSlug)
    .eq("user_id", user.id)
    .eq("list", list);
  if (error) throw error;
}

/**
 * Logs that a place was surfaced (by a discovery mode) or opened (`"view"`).
 * Append-only, no upsert — each call is its own row, exactly like
 * `partner_visits`. Never throws on a missing session: every discovery
 * surface calls this best-effort after a pick, and a silently-skipped log
 * entry (e.g. mid sign-out) should never be the reason a reveal fails.
 */
export async function logPlaceShown(placeSlug: string, source: PlaceShownSource): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("place_shown_log")
    .insert({ place_slug: placeSlug, user_id: user.id, source });
  if (error) throw error;
}
