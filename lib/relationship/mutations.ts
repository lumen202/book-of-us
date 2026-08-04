import { createClient } from "@/lib/supabase/server";
import { getRelationship } from "./queries";
import type { LoveLetter } from "./types";

/**
 * Saves the couple's own replacement for the ceremony's default letter.
 *
 * Same "two-person archive, everyone edits everything" model as the rest of the app (see
 * `lib/auth/admin.ts`) — either signed-in account can update it, mirroring the plain
 * signed-in-or-throw check `lib/memories/mutations.ts`'s `createMemory` uses, not `requireAdmin()`.
 */
export async function updateLoveLetter(letter: LoveLetter): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to save the letter.");

  const salutation = letter.salutation.trim();
  const body = letter.body.trim();
  const signoff = letter.signoff.trim();
  if (!salutation || !body || !signoff) {
    throw new Error("Every line of the letter needs something written on it.");
  }

  const relationship = await getRelationship();
  if (!relationship) {
    throw new Error("Set up the relationship in Settings before customizing the letter.");
  }

  const { error } = await supabase
    .from("relationship")
    .update({ settings: { ...relationship.settings, loveLetter: { salutation, body, signoff } } })
    .eq("id", true);

  if (error) throw error;
}

/**
 * Saves the couple's own replacement for the ceremony's default whisper lines (the spoken lines
 * between the look-back photos and the "Happy Nth Monthsary" reveal — see `whispers.ts`). Same
 * access model as `updateLoveLetter`: any signed-in account, no `requireAdmin()`.
 */
export async function updateWhisperLines(lines: string[]): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to save the whisper.");

  const trimmed = lines.map((line) => line.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    throw new Error("The whisper needs at least one line.");
  }

  const relationship = await getRelationship();
  if (!relationship) {
    throw new Error("Set up the relationship in Settings before customizing the whisper.");
  }

  const { error } = await supabase
    .from("relationship")
    .update({ settings: { ...relationship.settings, whisperLines: trimmed } })
    .eq("id", true);

  if (error) throw error;
}
