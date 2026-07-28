"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addMemory } from "@/app/(app)/chapters/[slug]/actions";
import { formatMonthDay } from "@/lib/format/date";
import { downscaleImage } from "@/lib/media/downscaleImage";
import { createClient } from "@/lib/supabase/client";

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

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Adding to the album.
 *
 * Shows up as an empty slot on the album page rather than an "Upload" button —
 * the same corner mounts as a real print, just waiting.
 *
 * Two inputs, on purpose: pick photos, optionally write a caption. Everything
 * else the row needs is inferred. `occurred_at` is NOT NULL in the schema, so
 * it silently takes today's date rather than becoming a date picker — asking
 * her to fill in metadata is exactly the "operating a UI" feeling this product
 * is trying not to have. If back-dating an old photo becomes a real need, it
 * belongs somewhere later in the flow, not in the way of adding one.
 *
 * Files are downscaled and uploaded straight from the browser to Storage (see
 * `lib/media/downscaleImage.ts` for why not through the Server Action), and
 * only the resulting paths are handed to the action that writes the row.
 * Selecting several photos at once creates one memory per photo — an album
 * page is filled a handful of prints at a time, not one.
 */
export function MemoryComposer({
  chapterId,
  chapterSlug,
}: {
  chapterId: string;
  chapterSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = progress !== null;

  function reset() {
    setFiles([]);
    setCaption("");
    setProgress(null);
    setError(null);
  }

  async function handleSave() {
    if (files.length === 0) {
      setError("Pick at least one photo first.");
      return;
    }
    setError(null);

    const supabase = createClient();

    try {
      for (const [index, file] of files.entries()) {
        setProgress(
          files.length === 1 ? "Tucking it in…" : `Tucking in ${index + 1} of ${files.length}…`,
        );

        const id = crypto.randomUUID();
        const folder = `chapters/${chapterId}/${id}`;

        const original = await downscaleImage(file, {
          maxEdge: ORIGINAL_MAX_EDGE,
          quality: 0.85,
        });
        const thumb = await downscaleImage(file, { maxEdge: THUMB_MAX_EDGE, quality: 0.72 });

        const storagePath = `${folder}/original.${original.extension}`;
        const thumbnailPath = `${folder}/thumb.${thumb.extension}`;

        for (const [path, blob] of [
          [storagePath, original.blob],
          [thumbnailPath, thumb.blob],
        ] as const) {
          const { error: uploadError } = await supabase.storage
            .from("memories")
            .upload(path, blob, { contentType: blob.type, upsert: false });
          if (uploadError) throw uploadError;
        }

        await addMemory({
          id,
          chapterId,
          chapterSlug,
          type: "photo",
          // `title` is NOT NULL, but the caption is optional — an uncaptioned
          // print gets the date it was added rather than the word "Untitled",
          // which reads like a missing field instead of a photo.
          title: caption.trim() || formatMonthDay(new Date()),
          body: null,
          occurredAt: todayIso(),
          storagePath,
          thumbnailPath,
          meta: { width: original.width, height: original.height },
        });
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setProgress(null);
      setError(caught instanceof Error ? caught.message : "That didn't save. Try again?");
    }
  }

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          /* Sits directly under the chapter heading, above the prints. It used
             to live at the very bottom of the page, which meant scrolling past
             every photo in the chapter to add one more. */
          <motion.button
            key="slot"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="group flex items-center gap-3 rounded-full border-2 border-dashed border-border bg-surface/60 px-6 py-3 text-left transition duration-500 hover:border-accent/60 hover:bg-surface/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="text-lg leading-none text-ink-muted transition group-hover:text-accent">
              +
            </span>
            <span className="text-[11px] uppercase tracking-[0.24em] text-ink-muted transition group-hover:text-ink">
              Add photos to this chapter
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="composer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-lg rounded-[2rem] border border-border bg-surface/95 p-7 shadow-[0_22px_42px_-26px_rgba(76,59,48,0.42)]"
          >
            <p className="font-serif text-2xl italic text-ink">Add to this chapter</p>

            <label className="mt-6 block text-[11px] uppercase tracking-[0.22em] text-ink-muted">
              Photos
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                className="mt-2 block w-full text-sm normal-case tracking-normal text-ink file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.18em] file:text-ink"
              />
            </label>

            {files.length > 0 && (
              <p className="mt-2 text-xs text-ink-muted">
                {files.length === 1 ? "1 photo ready" : `${files.length} photos ready`} — they&apos;ll be
                resized before they&apos;re saved.
              </p>
            )}

            <label className="mt-5 block text-[11px] uppercase tracking-[0.22em] text-ink-muted">
              Caption <span className="normal-case tracking-normal">(optional)</span>
              <input
                type="text"
                value={caption}
                disabled={busy}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Leave it blank if you'd rather not say"
                className="mt-2 block w-full border-b border-border bg-transparent py-1.5 font-serif text-lg normal-case tracking-normal text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
              />
            </label>

            {error && <p className="mt-4 text-sm text-accent">{error}</p>}

            <div className="mt-7 flex items-center gap-5">
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="rounded-full bg-accent px-6 py-2.5 text-[11px] uppercase tracking-[0.24em] text-surface shadow-[0_8px_16px_-8px_rgba(76,59,48,0.5)] transition hover:scale-[1.03] hover:brightness-95 disabled:opacity-60 motion-reduce:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {progress ?? "Tuck it in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
                disabled={busy}
                className="text-[11px] uppercase tracking-[0.22em] text-ink-muted transition hover:text-ink disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Not now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
