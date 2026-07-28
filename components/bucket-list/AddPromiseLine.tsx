"use client";

import { useState, useTransition } from "react";
import { addPromise } from "@/app/(app)/bucket-list/actions";
import { CATEGORIES, type BucketCategory } from "@/lib/bucket-list/types";
import { CategoryGlyph } from "./CategoryGlyph";

/**
 * One line at the end of the list. No modal, no form, no Save button — tap
 * it, it becomes an input, press Enter, it's a promise. The category starts
 * at "other" and is set by tapping its margin glyph, which cycles rather
 * than opening a `<select>`; the note is a second, optional tap so it never
 * shows by default.
 */
export function AddPromiseLine() {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BucketCategory>("other");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setCategory("other");
    setNote("");
    setNoteOpen(false);
    setEditing(false);
  }

  function cycleCategory() {
    const index = CATEGORIES.findIndex((entry) => entry.value === category);
    setCategory(CATEGORIES[(index + 1) % CATEGORIES.length].value);
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      reset();
      return;
    }
    startTransition(async () => {
      await addPromise({ title: trimmed, category, note: note || null });
      reset();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex w-full items-center gap-3 py-2 text-left focus-visible:outline-none"
      >
        <span
          aria-hidden
          className="text-lg leading-none text-ink-muted transition group-hover:text-accent"
        >
          +
        </span>
        <span className="font-serif text-lg italic text-ink-muted transition group-hover:text-ink">
          and one day, we&apos;ll…
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2">
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
          autoFocus
          type="text"
          value={title}
          disabled={pending}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") reset();
          }}
          onBlur={() => {
            if (!title.trim()) reset();
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

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-0.5 shrink-0 text-[11px] uppercase tracking-[0.22em] text-accent transition hover:brightness-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        {pending ? "…" : "Add"}
      </button>
    </div>
  );
}
