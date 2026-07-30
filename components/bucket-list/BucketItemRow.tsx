"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import type { BucketListItem, BucketCategory } from "@/lib/bucket-list/types";
import { CATEGORIES } from "@/lib/bucket-list/types";
import { CategoryGlyph } from "./CategoryGlyph";

/**
 * A persistent remove control, not one hidden behind a gesture — same
 * reasoning as the × on `MemoryCard`: "on a touch screen there is no hover,
 * and a control you can't find isn't a control." The `before` pseudo-element
 * pads the tappable area out to the touch-target comfort minimum without
 * enlarging the visible glyph.
 */
function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="relative shrink-0 self-start text-base leading-none text-ink-muted/60 transition before:absolute before:-inset-2.5 before:content-[''] hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      ×
    </button>
  );
}

function TickTarget({
  drawn,
  onClick,
  label,
}: {
  drawn: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={drawn}
      title={label}
      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-muted/45 text-accent transition hover:scale-110 hover:border-accent hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <motion.path
          d="M4.5 10.2l3.6 3.6L15.5 6"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </svg>
    </button>
  );
}

export function BucketItemRow({
  item,
  memoryLink,
  isCompleting,
  currentUserId,
  onTick,
  onReopen,
  onAttachPhoto,
  onSave,
  onAskRemove,
}: {
  item: BucketListItem;
  /** Present only when this item is done and its memory hasn't been removed. */
  memoryLink: { chapterSlug: string; chapterTitle: string } | null;
  /** True while the completion modal is open (or working) for this item. */
  isCompleting: boolean;
  /** Whose promise this is shows as "you" / "your partner" — see `MemoryCard` for why not a name. */
  currentUserId: string | null;
  onTick: () => void;
  onReopen: () => void;
  onAttachPhoto: () => void;
  onSave: (updates: { title?: string; note?: string; category?: BucketCategory }) => Promise<void>;
  onAskRemove: () => void;
}) {
  const isDone = item.status === "done";
  const addedBy = item.createdBy && (
    <span className="normal-case tracking-normal text-ink-muted">
      · added by {item.createdBy === currentUserId ? "you" : "your partner"}
    </span>
  );
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note ?? "");
  const [category, setCategory] = useState(item.category);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setTitle(item.title);
    setNote(item.note ?? "");
    setCategory(item.category);
    setEditing(true);
  }

  function cycleCategory() {
    const index = CATEGORIES.findIndex((entry) => entry.value === category);
    setCategory(CATEGORIES[(index + 1) % CATEGORIES.length].value);
  }

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave({ title: trimmed, note, category });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-background/60 px-2 py-2">
        <button
          type="button"
          onClick={cycleCategory}
          aria-label="Change category"
          className="mt-1.5 h-4 w-4 shrink-0 text-ink-muted transition hover:text-accent"
        >
          <CategoryGlyph category={category} className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && save()}
            className="w-full border-b border-border bg-transparent py-1 font-serif text-lg italic text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note"
            className="mt-1.5 w-full border-b border-border/60 bg-transparent py-1 text-sm text-ink-muted placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-[11px] uppercase tracking-[0.22em] text-accent disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="text-[11px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 py-1.5 opacity-75 transition hover:opacity-100"
      >
        <TickTarget drawn label={`Un-tick "${item.title}"`} onClick={onReopen} />
        <span className="mt-1.5 h-4 w-4 shrink-0 text-ink-muted">
          <CategoryGlyph category={item.category} className="h-4 w-4" />
        </span>
        <div className="flex-1 pt-0.5">
          <p className="font-serif text-lg italic leading-snug text-ink-muted line-through decoration-border">
            {item.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] uppercase tracking-[0.2em]">
            {memoryLink ? (
              <Link
                href={`/chapters/${memoryLink.chapterSlug}`}
                className="text-accent underline decoration-border underline-offset-4 transition hover:text-ink"
              >
                there&apos;s a photograph
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAttachPhoto}
                className="text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
              >
                add the photograph when you find it
              </button>
            )}
            {addedBy}
          </div>
        </div>
        <RemoveButton label={`Remove "${item.title}" from the list`} onClick={onAskRemove} />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: isCompleting ? -2 : 0 }}
      className="flex items-start gap-3 py-1.5"
    >
      <TickTarget
        drawn={isCompleting}
        label={`Mark "${item.title}" as kept`}
        onClick={onTick}
      />
      <span className="mt-1.5 h-4 w-4 shrink-0 text-ink-muted">
        <CategoryGlyph category={item.category} className="h-4 w-4" />
      </span>
      {/* The whole line is the edit target — tap it, it becomes an input,
          rather than a gesture (long-press) that turned out to be hard to
          find on a desktop pointer. */}
      <button
        type="button"
        onClick={startEditing}
        className="flex-1 pt-0.5 text-left focus-visible:outline-none"
      >
        <p className="font-serif text-lg italic leading-snug text-ink underline decoration-transparent decoration-2 underline-offset-4 transition hover:decoration-border">
          {item.title}
        </p>
        {item.note && <p className="mt-0.5 text-sm text-ink-muted">({item.note})</p>}
        {addedBy && (
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.2em]">{addedBy}</p>
        )}
      </button>
      <RemoveButton label={`Remove "${item.title}" from the list`} onClick={onAskRemove} />
    </motion.div>
  );
}
