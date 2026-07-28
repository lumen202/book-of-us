import { downscaleImage } from "@/lib/media/downscaleImage";
import { createClient } from "@/lib/supabase/client";

/** Matched to `lib/storage/getVaultSignedUrl.ts`'s renditions. */
const ORIGINAL_MAX_EDGE = 1600;
const THUMB_MAX_EDGE = 480;

export type UploadedVaultMedia = {
  storagePath: string;
  thumbnailPath: string;
  meta: { width: number; height: number; image_bytes: number };
};

/**
 * The vault's copy of `lib/media/uploadMemoryMedia.ts` — same downscale-then-
 * upload sequence, into the `vault` bucket instead of `memories`. Kept as a
 * separate function rather than parameterizing the original: the two buckets
 * must never share a code path that could be pointed at the wrong one by a
 * future edit to a shared default.
 */
export async function uploadVaultMedia(
  file: File,
  { itemId }: { itemId: string },
): Promise<UploadedVaultMedia> {
  const supabase = createClient();
  const folder = `vault/${itemId}`;

  const original = await downscaleImage(file, { maxEdge: ORIGINAL_MAX_EDGE, quality: 0.85 });
  const thumb = await downscaleImage(file, { maxEdge: THUMB_MAX_EDGE, quality: 0.72 });

  const storagePath = `${folder}/original.${original.extension}`;
  const thumbnailPath = `${folder}/thumb.${thumb.extension}`;

  for (const [path, blob] of [
    [storagePath, original.blob],
    [thumbnailPath, thumb.blob],
  ] as const) {
    const { error } = await supabase.storage
      .from("vault")
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
  }

  return {
    storagePath,
    thumbnailPath,
    meta: { width: original.width, height: original.height, image_bytes: original.blob.size },
  };
}
