"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  attachPromiseMemory,
  keepPromise,
  resolveChapterForCompletion,
} from "@/app/(app)/bucket-list/actions";
import { todayIso } from "@/lib/format/date";
import { uploadMemoryMedia } from "@/lib/media/uploadMemoryMedia";
import type { BucketListItem } from "@/lib/bucket-list/types";

type Stage = "ask" | "working" | "become" | "resolve";

/** A slight, deterministic list — matches the corner-mounted prints elsewhere in the book. */
const TILT_DEG = -1.4;

/**
 * The emotional centre of the feature: tick → ask → working → become →
 * resolve. `BucketItemRow` plays the tick itself before this ever mounts;
 * everything from "ask" onward lives here.
 *
 * Deliberately not optimistic (see `BucketList`'s note on why) — the modal
 * stays open through the whole write, and "become" only plays once the
 * server has actually confirmed the print exists.
 */
export function CompletionModal({
  item,
  mode,
  onClose,
  onDone,
}: {
  item: BucketListItem;
  /** "attach" is the photo-later path — a photo is required, there's no skip. */
  mode: "complete" | "attach";
  onClose: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Stable across retries within one modal session: if the memory write
  // succeeds but the link write after it fails, resubmitting reuses this
  // same id so the server treats it as a retry rather than a second print —
  // see `writeLinkedMemory` in lib/bucket-list/mutations.ts.
  const [memoryId] = useState(() => crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [occurredAt, setOccurredAt] = useState(todayIso());
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>("ask");
  const [error, setError] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState<string | null>(null);
  const [chapterSlug, setChapterSlug] = useState<string | null>(null);
  const [keptWithoutPhoto, setKeptWithoutPhoto] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function pickFile(selected: File | null) {
    setFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  async function submit() {
    setError(null);
    setStage("working");
    try {
      if (file) {
        const chapter = await resolveChapterForCompletion();
        setChapterTitle(chapter.title);
        setChapterSlug(chapter.slug);
        const uploaded = await uploadMemoryMedia(file, { chapterId: chapter.id, memoryId });

        const photo = {
          chapterId: chapter.id,
          chapterSlug: chapter.slug,
          memoryId,
          storagePath: uploaded.storagePath,
          thumbnailPath: uploaded.thumbnailPath,
          meta: uploaded.meta,
        };

        if (mode === "attach") {
          await attachPromiseMemory({ itemId: item.id, occurredAt, note, photo });
        } else {
          await keepPromise({ itemId: item.id, occurredAt, note, photo });
        }

        setStage("become");
        window.setTimeout(
          () => setStage("resolve"),
          prefersReducedMotion ? 60 : 900,
        );
      } else {
        // Only reachable in "complete" mode — "attach" never renders a
        // submit control without a file selected.
        await keepPromise({ itemId: item.id, occurredAt, note, photo: null });
        setKeptWithoutPhoto(true);
        setStage("resolve");
      }
      router.refresh();
    } catch (caught) {
      setStage("ask");
      setError(caught instanceof Error ? caught.message : "That didn't save. Try again?");
    }
  }

  function finish() {
    onDone();
  }

  const busy = stage !== "ask";
  const heading = mode === "attach" ? "Add the photograph" : "You kept it.";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[2px]"
      onClick={() => !busy && onClose()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <motion.div
        onClick={(event) => event.stopPropagation()}
        className="scene-card w-full max-w-sm rounded-[1.75rem] border border-border bg-surface p-7 text-center shadow-[0_28px_50px_-28px_rgba(76,59,48,0.45)]"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24, scale: prefersReducedMotion ? 1 : 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {stage === "ask" && (
            <motion.div
              key="ask"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 id="completion-modal-title" className="font-serif text-2xl leading-snug text-ink">
                {heading}
              </h2>
              <p className="mt-2 font-serif text-lg italic text-ink-muted">{item.title}</p>

              <label className="mt-6 block text-left text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                Photo {mode === "complete" && <span className="normal-case tracking-normal">(optional — no photo? that&apos;s alright)</span>}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-sm normal-case tracking-normal text-ink file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.18em] file:text-ink"
                />
              </label>

              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="mt-3 aspect-[4/3] w-full rounded-xl object-cover"
                />
              )}

              <div className="mt-5 text-left">
                {!showDatePicker ? (
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className="text-[11px] uppercase tracking-[0.2em] text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
                  >
                    Kept today — not today?
                  </button>
                ) : (
                  <label className="block text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                    When
                    <input
                      type="date"
                      value={occurredAt}
                      max={todayIso()}
                      onChange={(event) => setOccurredAt(event.target.value)}
                      className="mt-2 block w-full border-b border-border bg-transparent py-1.5 text-sm normal-case tracking-normal text-ink focus:border-accent focus:outline-none"
                    />
                  </label>
                )}
              </div>

              <label className="mt-5 block text-left text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                Note <span className="normal-case tracking-normal">(optional)</span>
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={item.title}
                  className="mt-2 block w-full border-b border-border bg-transparent py-1.5 font-serif text-lg normal-case tracking-normal text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
                />
              </label>

              {error && <p className="mt-4 text-sm text-accent">{error}</p>}

              <div className="mt-7 flex items-center justify-center gap-5">
                <button
                  type="button"
                  onClick={submit}
                  disabled={mode === "attach" && !file}
                  className="rounded-full bg-accent px-6 py-2.5 text-[11px] uppercase tracking-[0.24em] text-surface shadow-[0_8px_16px_-8px_rgba(76,59,48,0.5)] transition hover:brightness-95 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {mode === "attach" ? "Attach it" : "Keep this promise"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] uppercase tracking-[0.22em] text-ink-muted transition hover:text-ink"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          )}

          {stage === "working" && (
            <motion.div
              key="working"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="aspect-[4/5] w-40 rounded-xl object-cover opacity-90" />
              ) : null}
              <p className="font-serif text-lg italic text-ink-muted">
                {previewUrl ? "Tucking it in…" : "Writing it down…"}
              </p>
            </motion.div>
          )}

          {stage === "become" && previewUrl && (
            <motion.div
              key="become"
              className="flex flex-col items-center py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                initial={{
                  scale: prefersReducedMotion ? 1 : 1.15,
                  rotate: 0,
                }}
                animate={{ scale: 1, rotate: TILT_DEG }}
                transition={{ duration: prefersReducedMotion ? 0.3 : 0.7, ease: "easeOut" }}
                className="w-48 rounded-2xl bg-[#fffdf7] p-3 pb-4 shadow-[0_16px_30px_-16px_rgba(76,59,48,0.5)]"
              >
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                </div>
              </motion.div>
              <p className="mt-4 font-serif text-lg italic text-ink-muted">The promise becomes the print.</p>
            </motion.div>
          )}

          {stage === "resolve" && (
            <motion.div
              key="resolve"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-4 py-4"
            >
              <p className="font-serif text-2xl leading-snug text-ink">Kept.</p>
              <p className="text-sm text-ink-muted">
                {keptWithoutPhoto
                  ? "Written down — no photograph, and that's alright."
                  : chapterTitle
                    ? `Tucked into ${chapterTitle}.`
                    : "It's in the album."}
              </p>
              <div className="mt-2 flex flex-col items-center gap-3">
                {chapterSlug && (
                  <a
                    href={`/chapters/${chapterSlug}`}
                    className="text-[11px] uppercase tracking-[0.22em] text-accent underline decoration-border underline-offset-4 transition hover:text-ink"
                  >
                    see it in the album
                  </a>
                )}
                <button
                  type="button"
                  onClick={finish}
                  className="rounded-full bg-accent px-6 py-2.5 text-[11px] uppercase tracking-[0.24em] text-surface transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Back to the list
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
