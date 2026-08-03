"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, useTransition } from "react";
import { addPromise, addPromiseAlbumPhoto, resolveChapterForCompletion } from "@/app/(app)/bucket-list/actions";
import { todayIso } from "@/lib/format/date";
import { uploadMemoryMedia } from "@/lib/media/uploadMemoryMedia";
import type { BucketCategory } from "@/lib/bucket-list/types";
import { CategoryDropdown } from "./CategoryDropdown";

/**
 * Same optional-note UX as the old inline `AddPromiseLine`, staged in a modal
 * like `ConfirmDialog` / `CompletionModal` instead of morphing a row in
 * place. Category is its own labeled field with `CategoryDropdown` — it used
 * to be a small tap-to-cycle glyph squeezed into the title row's left margin,
 * which read as decoration rather than a control.
 *
 * The optional photo here is a *reference* picture — "this is roughly what
 * we're picturing" — not the kept-promise print (`CompletionModal` owns
 * that, separately, when the promise is actually kept). It reuses the same
 * album machinery (`addPromiseAlbumPhoto`, `lib/bucket-list/mutations.ts`'s
 * `addAlbumPhoto`) a kept promise's extra photos go through — an id is
 * generated here so the new row's id exists before either write happens, the
 * same reason `CompletionModal` generates one for its memory. This is a
 * deliberate reversal of the list page's old "zero images" rule (see
 * `docs/agent/codebase-map/bucket-list.md`); the list page itself still
 * signs nothing eagerly, a reference photo only surfaces once its row is
 * opened.
 */
export function AddPromiseModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BucketCategory>("other");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function pickFile(selected: File | null) {
    setFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = crypto.randomUUID();
        await addPromise({ id, title: trimmed, category, note: note || null });

        if (file) {
          const chapter = await resolveChapterForCompletion();
          const memoryId = crypto.randomUUID();
          const { storagePath, thumbnailPath, meta } = await uploadMemoryMedia(file, {
            chapterId: chapter.id,
            memoryId,
          });
          await addPromiseAlbumPhoto({
            itemId: id,
            occurredAt: todayIso(),
            note: "",
            photo: { chapterId: chapter.id, memoryId, storagePath, thumbnailPath, meta },
          });
        }

        onClose();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That didn't save. Try again?");
      }
    });
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-promise-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[2px]"
      onClick={() => !pending && onClose()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="scene-card w-full max-w-sm rounded-[1.75rem] border border-border bg-surface p-7 shadow-[0_28px_50px_-28px_rgba(76,59,48,0.45)]"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <h2 id="add-promise-modal-title" className="font-serif text-2xl leading-snug text-ink">
          And one day, we&apos;ll…
        </h2>

        <div className="mt-6">
          <input
            ref={titleRef}
            type="text"
            value={title}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="…see snow together"
            className="w-full border-b border-border bg-transparent py-1 font-serif text-lg italic text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
          />

          <div className="mt-1.5 flex items-center gap-4">
            {!noteOpen && (
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                className="text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink"
              >
                add a note
              </button>
            )}
            {!photoOpen && (
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                className="text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink"
              >
                add a picture
              </button>
            )}
          </div>

          {noteOpen && (
            <input
              type="text"
              value={note}
              disabled={pending}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional"
              className="mt-2 w-full border-b border-border/60 bg-transparent py-1 text-sm text-ink-muted placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
            />
          )}

          {photoOpen && (
            <div className="mt-3">
              <input
                type="file"
                accept="image/*"
                disabled={pending}
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm normal-case tracking-normal text-ink file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.18em] file:text-ink"
              />
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="mt-3 aspect-[4/3] w-full rounded-xl object-cover"
                />
              )}
            </div>
          )}
        </div>

        <div className="mt-5">
          <span className="block text-[11px] uppercase tracking-[0.22em] text-ink-muted">
            Category
          </span>
          <div className="mt-1.5">
            <CategoryDropdown category={category} onChange={setCategory} disabled={pending} />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-accent">{error}</p>}

        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !title.trim()}
            className="rounded-full bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-surface transition hover:brightness-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {pending ? "One moment…" : "Add"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-ink-muted transition hover:text-ink disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Never mind
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
