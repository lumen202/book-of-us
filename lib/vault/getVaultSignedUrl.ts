import { createClient } from "@/lib/supabase/server";
import { getActiveProjectFromCookies } from "@/lib/supabase/project.server";
import { resolveBucketName } from "@/lib/supabase/project";

/**
 * Five minutes, not the hour `lib/storage/getSignedUrl.ts` uses for the main
 * book. That hour is deliberately tuned for CDN cache economics on content
 * both accounts already see freely on every visit — exactly the opposite of
 * what the vault is for. A signed URL that outlives the unlocked session it
 * was minted for is a leak the password gate would otherwise exist to
 * prevent, so vault URLs are minted fresh every unlock and expire quickly
 * rather than being cached across visits. Same reasoning that file's own
 * comment already flags for time-capsule media — this is that same carve-out.
 */
const VAULT_SIGNED_URL_TTL_SECONDS = 60 * 5;

const RENDITIONS = {
  /** The vault grid. */
  thumb: { width: 480, height: 480, resize: "contain" as const, quality: 68 },
  /** Opened full-screen. */
  full: { width: 1600, height: 1600, resize: "contain" as const, quality: 80 },
};

export type VaultRendition = keyof typeof RENDITIONS;

/**
 * The `vault` bucket is private, so a raw storage path is never directly
 * renderable — this is the only path the app uses to turn one into a usable
 * URL, always called server-side, never with the service key.
 *
 * Falls back to an untransformed signed URL if the resize transform isn't
 * available on the current Supabase plan, same fallback `getSignedUrl.ts`
 * uses for the main book — a heavier image, not a broken one.
 */
export async function getVaultSignedUrl(path: string, rendition: VaultRendition): Promise<string | null> {
  const supabase = await createClient();
  const bucketName = resolveBucketName(await getActiveProjectFromCookies(), "vault");
  const bucket = supabase.storage.from(bucketName);

  const { data, error } = await bucket.createSignedUrl(path, VAULT_SIGNED_URL_TTL_SECONDS, {
    transform: RENDITIONS[rendition],
  });
  if (!error) return data.signedUrl;

  const fallback = await bucket.createSignedUrl(path, VAULT_SIGNED_URL_TTL_SECONDS);
  if (fallback.error) return null;
  return fallback.data.signedUrl;
}
