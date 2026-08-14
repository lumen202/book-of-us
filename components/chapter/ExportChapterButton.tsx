"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Waiting } from "@/components/ui/Waiting";

/**
 * "Export this chapter" — fetching every full-size photo and binding them
 * into a PDF (`app/(app)/chapters/[slug]/export/route.tsx`) genuinely takes
 * a few seconds for a chapter with more than a handful of prints, long
 * enough that a changed button label isn't reassurance enough on its own
 * (see `docs/agent/codebase-map/waiting-states.md`'s "in-place waits"
 * section) — so this reaches for the same modal shell `ConfirmDialog` uses,
 * with `Waiting` standing in for buttons while it's busy. No spinner: three
 * ink drops, same as everywhere else in the book.
 *
 * A plain `<a href>` to the route would have worked for the download itself,
 * but it gives no way to show anything while the server is still generating
 * the file — the tap would sit there looking like nothing happened. Fetching
 * as a blob and triggering the download from script is what buys the wait
 * state.
 */
export function ExportChapterButton({ chapterSlug }: { chapterSlug: string }) {
  const [status, setStatus] = useState<"idle" | "exporting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleExport() {
    setStatus("exporting");
    try {
      const response = await fetch(`/chapters/${chapterSlug}/export`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErrorMessage(body?.error ?? "That didn't come together. Try again?");
        setStatus("error");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${chapterSlug}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      setErrorMessage("That didn't come together. Try again?");
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        // `ink-legible`: this link sits directly on the scene with no card
        // under it, and at night it lands on the moon's halo — muted ink on a
        // bright glow was BUG-015. Same treatment as every other bare-scene
        // label (BUG-007/008/009): pale letterforms + dark halo on the 5th.
        className="ink-legible text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        Export this chapter
      </button>

      <AnimatePresence>
        {status === "exporting" && (
          <motion.div
            key="exporting"
            role="dialog"
            aria-modal="true"
            aria-label="Exporting this chapter"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className="flex w-full max-w-sm flex-col items-center gap-1 rounded-3xl border border-border bg-surface p-9 text-center shadow-[0_28px_50px_-28px_rgba(76,59,48,0.45)]"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <Waiting label="Binding your pages…" size="lg" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === "error" && (
          <ConfirmDialog
            key="export-error"
            title="That didn't export."
            body={errorMessage}
            confirmLabel="Try again"
            cancelLabel="Never mind"
            onConfirm={handleExport}
            onCancel={() => setStatus("idle")}
          />
        )}
      </AnimatePresence>
    </>
  );
}
