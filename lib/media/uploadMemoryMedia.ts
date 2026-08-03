import { downscaleImage } from "./downscaleImage";
import { createClient } from "@/lib/supabase/client";
import { resolveBucketName, resolveProjectFromDocumentCookie } from "@/lib/supabase/project";

/**
 * The largest box a photo is ever shown in — matched exactly to
 * `RENDITIONS.full` in `lib/storage/getSignedUrl.ts`, which asks for 1600px
 * and is the biggest rendition anything in this app requests, `PhotoLightbox`
 * included.
 *
 * It was 2000. Those extra 400px were never displayed by any view on any plan:
 * with the Storage image transform enabled they'd be downsampled to 1600 on
 * the way out, and without it (the free plan — the transform is a Pro+ add-on)
 * the untransformed original is served as-is, so the whole 2000px file went
 * over the wire to be drawn at 1600. Area scales with the square, so this is
 * roughly a third off every original, both in the 1 GB bucket and in egress.
 *
 * Only affects uploads from here on; photos already in the bucket keep their
 * size until something re-processes them.
 */
const ORIGINAL_MAX_EDGE = 1600;
const THUMB_MAX_EDGE = 720;

export type UploadedMemoryMedia = {
  storagePath: string;
  thumbnailPath: string;
  meta: { width: number; height: number; image_bytes: number };
};

/**
 * The one path from a `File` picked in the browser to two objects sitting in
 * the `memories` bucket — original and thumbnail, downscaled, uploaded
 * straight from the client so a Server Action never has to carry a phone
 * photo through its request body.
 *
 * Extracted out of `MemoryComposer` so the bucket list's completion flow
 * (`components/bucket-list/CompletionModal.tsx`) can call the exact same
 * sequence rather than growing a second copy of it. Whichever caller uploads
 * a photo, it goes through here — that's what keeps the free-tier downscale
 * settings above a single edit instead of two.
 */
export async function uploadMemoryMedia(
  file: File,
  { chapterId, memoryId }: { chapterId: string; memoryId: string },
): Promise<UploadedMemoryMedia> {
  const supabase = createClient();
  const bucket = resolveBucketName(resolveProjectFromDocumentCookie(), "memories");
  const folder = `chapters/${chapterId}/${memoryId}`;

  const original = await downscaleImage(file, { maxEdge: ORIGINAL_MAX_EDGE, quality: 0.85 });
  const thumb = await downscaleImage(file, { maxEdge: THUMB_MAX_EDGE, quality: 0.72 });

  const storagePath = `${folder}/original.${original.extension}`;
  const thumbnailPath = `${folder}/thumb.${thumb.extension}`;

  for (const [path, blob] of [
    [storagePath, original.blob],
    [thumbnailPath, thumb.blob],
  ] as const) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
  }

  return {
    storagePath,
    thumbnailPath,
    meta: { width: original.width, height: original.height, image_bytes: original.blob.size },
  };
}
