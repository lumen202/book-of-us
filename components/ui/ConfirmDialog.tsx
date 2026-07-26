"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * A small, soft confirmation dialog for the one or two places something is
 * taken off a page.
 *
 * Focus lands on **Cancel**, not the confirm button — the safe option should
 * be the one a stray Enter hits. Escape and a backdrop click both cancel.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Never mind",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[2px]"
      onClick={onCancel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-7 text-center shadow-[0_28px_50px_-28px_rgba(76,59,48,0.45)]"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <h2 id="confirm-dialog-title" className="font-serif text-2xl leading-snug text-ink">
          {title}
        </h2>
        {body && <p className="mt-3 text-sm leading-relaxed text-ink-muted">{body}</p>}

        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-surface transition hover:brightness-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {busy ? "One moment…" : confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-ink-muted transition hover:text-ink disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {cancelLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
