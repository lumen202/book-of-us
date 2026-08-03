"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addPromiseAlbumPhoto, resolveChapterForCompletion } from "@/app/(app)/bucket-list/actions";
import { todayIso } from "@/lib/format/date";
import { uploadMemoryMedia } from "@/lib/media/uploadMemoryMedia";

type PickedFile = { id: string; file: File; previewUrl: string };

/**
 * Adding to a kept promise's album. Modeled directly on
 * `components/memory/MemoryComposer.tsx` — multiple files in one go, one
 * shared optional caption, no date picker (the "don't ask for metadata"
 * reasoning written there applies here too).
 *
 * `resolveChapterForCompletion()` is only called for the upload's storage
 * path folder — storage paths aren't a security boundary (RLS on
 * `storage.objects` only checks `bucket_id`/`auth.uid()`, see
 * `0002_storage.sql`). The memory row this writes still gets `chapterId:
 * null` in the database (`addPromiseAlbumPhoto` → `addAlbumPhoto`), so it
 * never appears in that chapter's own grid — only here.
 */
export function AddAlbumPhotoComposer({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = progress !== null;

  // Object URLs are only good for this tab's lifetime — revoke whichever
  // ones are no longer in `files`, on every change and on unmount, so a
  // long session doesn't leak one per photo picked and then removed.
  useEffect(() => {
    return () => {
      for (const picked of files) URL.revokeObjectURL(picked.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only, not a re-run on every `files` change
  }, []);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const picked = Array.from(selected).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    // Accumulates rather than replaces — reopening the picker to grab a few
    // more photos shouldn't forget the ones already queued.
    setFiles((prev) => [...prev, ...picked]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((picked) => picked.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((picked) => picked.id !== id);
    });
  }

  function reset() {
    for (const picked of files) URL.revokeObjectURL(picked.previewUrl);
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

    try {
      const chapter = await resolveChapterForCompletion();

      for (const [index, picked] of files.entries()) {
        setProgress(
          files.length === 1 ? "Tucking it in…" : `Tucking in ${index + 1} of ${files.length}…`,
        );

        const memoryId = crypto.randomUUID();
        const { storagePath, thumbnailPath, meta } = await uploadMemoryMedia(picked.file, {
          chapterId: chapter.id,
          memoryId,
        });

        await addPromiseAlbumPhoto({
          itemId,
          occurredAt: todayIso(),
          note: caption,
          photo: { chapterId: chapter.id, memoryId, storagePath, thumbnailPath, meta },
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
              Add to the album
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
            <p className="font-serif text-2xl italic text-ink">Add to the album</p>

            <label className="mt-6 block text-[11px] uppercase tracking-[0.22em] text-ink-muted">
              Photos
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                onChange={(event) => addFiles(event.target.files)}
                className="mt-2 block w-full text-sm normal-case tracking-normal text-ink file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.18em] file:text-ink"
              />
            </label>

            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((picked) => (
                  <div key={picked.id} className="relative h-16 w-16 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={picked.previewUrl}
                      alt=""
                      className="h-full w-full rounded-lg object-cover"
                    />
                    {/* A misclick shouldn't cost an upload-then-delete round
                        trip — removing here just forgets the file, nothing
                        has been sent anywhere yet. */}
                    <button
                      type="button"
                      aria-label="Remove this photo"
                      onClick={() => removeFile(picked.id)}
                      disabled={busy}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-xs leading-none text-ink-muted shadow-[0_2px_6px_-2px_rgba(76,59,48,0.5)] transition hover:scale-110 hover:border-accent hover:text-accent disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
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
