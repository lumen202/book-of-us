import { createClient } from "@/lib/supabase/server";
import type { Relationship } from "./types";

/** Singleton settings row — see supabase/migrations/0001_init.sql. Null until seeded. */
export async function getRelationship(): Promise<Relationship | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("relationship").select("*").maybeSingle();

  if (error) throw error;
  return (data ?? null) as Relationship | null;
}
