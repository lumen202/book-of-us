import { createClient } from "@/lib/supabase/server";
import type { LoveLetter, Relationship } from "./types";

/** Singleton settings row — see supabase/migrations/0001_init.sql. Null until seeded. */
export async function getRelationship(): Promise<Relationship | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("relationship").select("*").maybeSingle();

  if (error) throw error;
  return (data ?? null) as Relationship | null;
}

/**
 * The couple's own replacement for the ceremony's default letter, if they've saved one — stored
 * at `relationship.settings.loveLetter`. `settings` is untyped jsonb, so this checks shape rather
 * than trusting it; anything malformed or absent returns `null` so callers fall back to the
 * ceremony's built-in copy instead of rendering broken text.
 */
export function getLoveLetter(relationship: Relationship | null): LoveLetter | null {
  const candidate = relationship?.settings.loveLetter;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    return null;
  }

  const { salutation, body, signoff } = candidate as Record<string, unknown>;
  if (
    typeof salutation !== "string" ||
    typeof body !== "string" ||
    typeof signoff !== "string" ||
    !salutation.trim() ||
    !body.trim() ||
    !signoff.trim()
  ) {
    return null;
  }

  return { salutation, body, signoff };
}

/**
 * The couple's own replacement for the ceremony's default whisper lines, if they've saved one —
 * stored at `relationship.settings.whisperLines`. Same defensive-shape reasoning as
 * `getLoveLetter`: anything malformed, empty, or absent returns `null` so callers fall back to
 * `monthsaryWhispers()`.
 */
export function getWhisperLines(relationship: Relationship | null): string[] | null {
  const candidate = relationship?.settings.whisperLines;
  if (!Array.isArray(candidate) || candidate.length === 0) return null;
  if (!candidate.every((line): line is string => typeof line === "string" && line.trim().length > 0)) {
    return null;
  }

  return candidate;
}
