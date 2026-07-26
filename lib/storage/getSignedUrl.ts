import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

/**
 * Named image sizes. Originals are whatever came off a phone camera (often
 * 4–8 MB), which is far more than an album print or a detail view ever
 * displays — every rendition below is asked for at roughly 2x its largest
 * on-screen box so it still looks right on a retina screen.
 */
const RENDITIONS = {
  /** Album prints in the chapter grid. */
  thumb: { width: 720, height: 720, resize: "contain", quality: 68 },
  /** The opened memory. */
  full: { width: 1600, height: 1600, resize: "contain", quality: 80 },
} as const;

export type ImageRendition = keyof typeof RENDITIONS;

/**
 * The `memories` Storage bucket is private, so a raw storage_path/thumbnail_path
 * is never directly renderable. This is the only path the app uses to turn one
 * into a usable URL — always called server-side (Server Components/Route
 * Handlers), never with the service key, so it's just as RLS-protected as any
 * other read.
 *
 * Passing a `rendition` asks Supabase to resize/recompress the image as it
 * serves it, so the browser never downloads the original. That transform is a
 * Storage add-on that isn't enabled on every plan, so a failure here falls
 * back to the untransformed original rather than rendering nothing — the page
 * just gets heavier, it doesn't break. Only pass a rendition for images;
 * video/audio have no transform and would take the fallback path every time.
 */
export async function getSignedUrl(
  path: string,
  rendition?: ImageRendition,
): Promise<string | null> {
  const supabase = await createClient();
  const bucket = supabase.storage.from("memories");

  if (rendition) {
    const { data, error } = await bucket.createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
      transform: RENDITIONS[rendition],
    });
    if (!error) return data.signedUrl;
  }

  const { data, error } = await bucket.createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}
