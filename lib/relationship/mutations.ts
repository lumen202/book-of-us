import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getRelationship } from "./queries";
import type { LoveLetter } from "./types";

/** Existing by-role slots for a settings key, preserved so saving one side never clobbers the other. */
function existingByRole(
  relationship: { settings: Record<string, unknown> },
  key: "loveLetter" | "whisperLines",
): Record<string, unknown> {
  const candidate = relationship.settings[key];
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return {};
  return candidate as Record<string, unknown>;
}

/**
 * Saves the current viewer's own letter — the one they're writing *for* their partner, never the
 * one written for them. Stored at `relationship.settings.loveLetter.{keeper,partner}`, keyed by
 * the same admin/non-admin identity `lib/auth/admin.ts` already uses everywhere else — either
 * signed-in account can save its own side, mirroring the plain signed-in-or-throw check
 * `lib/memories/mutations.ts`'s `createMemory` uses, not `requireAdmin()`.
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

  const role = isAdminEmail(user.email) ? "keeper" : "partner";
  const { error } = await supabase
    .from("relationship")
    .update({
      settings: {
        ...relationship.settings,
        loveLetter: {
          ...existingByRole(relationship, "loveLetter"),
          [role]: { salutation, body, signoff },
        },
      },
    })
    .eq("id", true);

  if (error) throw error;
}

/**
 * Saves the current viewer's own whisper lines (the spoken lines between the look-back photos and
 * the "Happy Nth Monthsary" reveal — see `whispers.ts`), the ones they're writing *for* their
 * partner. Same by-role storage and access model as `updateLoveLetter`.
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

  const role = isAdminEmail(user.email) ? "keeper" : "partner";
  const { error } = await supabase
    .from("relationship")
    .update({
      settings: {
        ...relationship.settings,
        whisperLines: { ...existingByRole(relationship, "whisperLines"), [role]: trimmed },
      },
    })
    .eq("id", true);

  if (error) throw error;
}
