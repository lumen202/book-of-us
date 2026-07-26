/**
 * Browser-side image downscaling, run before anything is uploaded.
 *
 * Photos come off a phone at 4000px and 4–8 MB. Storing them at that size
 * costs bucket space forever and costs her bandwidth on every visit, and no
 * screen in this app ever shows more than ~1600px of it. Shrinking at the
 * source means the heavy original never exists in the bucket at all — which is
 * a different fix from `lib/storage/getSignedUrl.ts`'s read-time transform,
 * and the two compose: small file in, smaller rendition out.
 *
 * Runs on the client on purpose. A Server Action would have to carry the full
 * original through a request body, and Next caps that well below phone-photo
 * size by default.
 */

export type Downscaled = {
  blob: Blob;
  /** File extension matching `blob.type`, no leading dot. */
  extension: string;
  width: number;
  height: number;
};

/**
 * WebP everywhere it's supported, which is every browser this app targets;
 * the JPEG path only exists so an old browser degrades instead of uploading
 * a 8 MB PNG.
 */
function pickOutputType(): { mime: string; extension: string } {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const supportsWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return supportsWebp
    ? { mime: "image/webp", extension: "webp" }
    : { mime: "image/jpeg", extension: "jpg" };
}

export async function downscaleImage(
  file: File,
  { maxEdge, quality }: { maxEdge: number; quality: number },
): Promise<Downscaled> {
  // `from-image` applies the EXIF orientation flag, so photos taken sideways
  // don't get baked in rotated — decoding without it is the classic cause of
  // "it was upright in my camera roll".
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this image for upload.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const { mime, extension } = pickOutputType();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  );
  if (!blob) throw new Error("Could not prepare this image for upload.");

  return { blob, extension, width, height };
}
