import { createClient } from "@/lib/supabase/server";
import type { LoveLetter, Relationship, SurpriseCooldown } from "./types";

/** Singleton settings row — see supabase/migrations/0001_init.sql. Null until seeded. */
export async function getRelationship(): Promise<Relationship | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("relationship").select("*").maybeSingle();

  if (error) throw error;
  return (data ?? null) as Relationship | null;
}

function parseLoveLetter(candidate: unknown): LoveLetter | null {
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
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

function parseWhisperLines(candidate: unknown): string[] | null {
  if (!Array.isArray(candidate) || candidate.length === 0) return null;
  if (!candidate.every((line): line is string => typeof line === "string" && line.trim().length > 0)) {
    return null;
  }

  return candidate;
}

/**
 * Letters are written *for* a partner, not shared between them — so each side of the couple gets
 * its own slot in `relationship.settings.loveLetter`/`.whisperLines`, keyed by role. "Keeper" is
 * the admin account (see `lib/auth/admin.ts`); the other account is "partner". There are only ever
 * these two accounts, so that existing identity check is what tells the two slots apart — no new
 * schema field needed.
 */
function byRole(
  relationship: Relationship | null,
  key: "loveLetter" | "whisperLines" | "surprises",
): Record<"keeper" | "partner", unknown> {
  const candidate = relationship?.settings[key];
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return { keeper: undefined, partner: undefined };
  }
  return candidate as Record<"keeper" | "partner", unknown>;
}

/**
 * The letter written *for* the current viewer — i.e. by the other account — if saved. `null` falls
 * back to the ceremony's hand-written default copy. Never the viewer's own draft; that stays a
 * surprise until their partner's ceremony plays it, same as `getWhisperLines` below.
 */
export function getLoveLetter(relationship: Relationship | null, viewerIsKeeper: boolean): LoveLetter | null {
  const letters = byRole(relationship, "loveLetter");
  return parseLoveLetter(viewerIsKeeper ? letters.partner : letters.keeper);
}

/** The letter the current viewer is writing *for* their partner — for prefilling Settings. */
export function getMyLoveLetterDraft(
  relationship: Relationship | null,
  viewerIsKeeper: boolean,
): LoveLetter | null {
  const letters = byRole(relationship, "loveLetter");
  return parseLoveLetter(viewerIsKeeper ? letters.keeper : letters.partner);
}

/** The whisper lines written *for* the current viewer, if saved — see `getLoveLetter`. */
export function getWhisperLines(relationship: Relationship | null, viewerIsKeeper: boolean): string[] | null {
  const whispers = byRole(relationship, "whisperLines");
  return parseWhisperLines(viewerIsKeeper ? whispers.partner : whispers.keeper);
}

/** The whisper lines the current viewer is writing *for* their partner — for prefilling Settings. */
export function getMyWhisperDraft(relationship: Relationship | null, viewerIsKeeper: boolean): string[] | null {
  const whispers = byRole(relationship, "whisperLines");
  return parseWhisperLines(viewerIsKeeper ? whispers.keeper : whispers.partner);
}

function parseSurpriseCooldown(candidate: unknown): SurpriseCooldown {
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return { recentIds: [], lastShownAt: null };
  }
  const { recentIds, lastShownAt } = candidate as Record<string, unknown>;
  return {
    recentIds: Array.isArray(recentIds) ? recentIds.filter((id): id is string => typeof id === "string") : [],
    lastShownAt: typeof lastShownAt === "string" ? lastShownAt : null,
  };
}

/**
 * The current viewer's own resurfacing cooldown — which prints `lib/surprises/`'s `pickSurprise`
 * should steer away from. Per-role, not shared: each side of the couple gets shown surprises on
 * their own visits, so each needs its own "don't repeat this" memory. Never defaults to empty
 * silently past `parseSurpriseCooldown`'s own fallback — an unset/malformed value just means
 * "nothing shown yet", which is the correct starting state.
 */
export function getSurpriseCooldown(
  relationship: Relationship | null,
  viewerIsKeeper: boolean,
): SurpriseCooldown {
  const byRoleValue = byRole(relationship, "surprises");
  return parseSurpriseCooldown(viewerIsKeeper ? byRoleValue.keeper : byRoleValue.partner);
}
