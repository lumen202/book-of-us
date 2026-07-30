"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, useTransition } from "react";
import { addPromise } from "@/app/(app)/bucket-list/actions";
import { CATEGORIES, type BucketCategory } from "@/lib/bucket-list/types";
import { CategoryGlyph } from "./CategoryGlyph";

/**
 * Same category-glyph-cycle + optional-note UX as the old inline
 * `AddPromiseLine`, just staged in a modal like `ConfirmDialog` /
 * `CompletionModal` instead of morphing a row in place.
 */
export function AddPromiseModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BucketCategory>("other");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function cycleCategory() {
    const index = CATEGORIES.findIndex((entry) => entry.value === category);
    setCategory(CATEGORIES[(index + 1) % CATEGORIES.length].value);
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addPromise({ title: trimmed, category, note: note || null });
      onClose();
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

        <div className="mt-6 flex items-start gap-3">
          <button
            type="button"
            onClick={cycleCategory}
            disabled={pending}
            aria-label="Change category"
            className="mt-1.5 h-4 w-4 shrink-0 text-ink-muted transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CategoryGlyph category={category} className="h-4 w-4" />
          </button>

          <div className="flex-1">
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

            {!noteOpen ? (
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink"
              >
                add a note
              </button>
            ) : (
              <input
                type="text"
                value={note}
                disabled={pending}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional"
                className="mt-1.5 w-full border-b border-border/60 bg-transparent py-1 text-sm text-ink-muted placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
              />
            )}
          </div>
        </div>

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
