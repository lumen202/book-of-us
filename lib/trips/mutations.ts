import { createClient } from "@/lib/supabase/server";

/** Starting a trip — the composer's "start a new trip" inline field, title only. */
export async function createTrip(input: {
  id: string;
  title: string;
  placeSlug?: string | null;
  startedOn?: string | null;
  endedOn?: string | null;
}): Promise<void> {
  const trimmed = input.title.trim();
  if (!trimmed) throw new Error("A trip needs a name.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to start a trip.");

  const { error } = await supabase.from("trips").insert({
    id: input.id,
    title: trimmed,
    place_slug: input.placeSlug ?? null,
    started_on: input.startedOn ?? null,
    ended_on: input.endedOn ?? null,
    created_by: user.id,
  });

  if (error) throw error;
}

/** Soft delete — same "never gone for good" model as everything else here. */
export async function softDeleteTrip(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw error;
}

export async function restoreTrip(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null);

  if (error) throw error;
}
