import { createClient } from "@/lib/supabase/server";
import type { Trip } from "./types";

/**
 * Reads go straight to the table, same reasoning `lib/bucket-list/queries.ts`
 * documents inline: trips have no time-capsule/unlock semantics, so the "no
 * raw reads" rule (scoped to `memories` specifically, for that reason) doesn't
 * apply here.
 */
function toTrip(row: {
  id: string;
  title: string;
  place_slug: string | null;
  started_on: string | null;
  ended_on: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}): Trip {
  return {
    id: row.id,
    title: row.title,
    placeSlug: row.place_slug,
    startedOn: row.started_on,
    endedOn: row.ended_on,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** Every trip, newest-started first (undated trips last) — the `/trips` shelf. */
export async function listTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .is("deleted_at", null)
    .order("started_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toTrip);
}

/** One trip, for its own page — `null` if it's gone (the page 404s). */
export async function getTrip(id: string): Promise<Trip | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data ? toTrip(data) : null;
}
