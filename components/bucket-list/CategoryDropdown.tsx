"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type BucketCategory } from "@/lib/bucket-list/types";
import { CategoryGlyph } from "./CategoryGlyph";

/**
 * Replaces the old tap-to-cycle glyph (a single icon that silently stepped
 * through all 7 categories one tap at a time, which read as decoration, not
 * a control — the whole category system was invisible until this changed).
 * Same unfold-panel mechanics as the nav's own dropdowns
 * (`DesktopMoreMenu`/`MobileNavMenu`/`AdminMenu`) — click-outside/Escape to
 * close, `framer-motion` fade-and-lift respecting `useReducedMotion` — reused
 * rather than invented, so this reads as the same book's handwriting as
 * everything else that opens this way.
 *
 * Every category is listed with its glyph, same "shown, not hidden behind a
 * cycle" spirit as `CategoryGlyph`'s own inline-SVG-in-the-margin approach.
 */
export function CategoryDropdown({
  category,
  onChange,
  disabled,
}: {
  category: BucketCategory;
  onChange: (category: BucketCategory) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const current = CATEGORIES.find((entry) => entry.value === category);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-ink-muted transition hover:text-accent disabled:opacity-60"
      >
        <CategoryGlyph category={category} className="h-4 w-4 shrink-0" />
        <span className="text-[10px] uppercase tracking-[0.18em]">{current?.label}</span>
        <svg
          viewBox="0 0 10 6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`h-2 w-2.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label="Category"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -6, scale: prefersReducedMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6, scale: prefersReducedMotion ? 1 : 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.2, ease: "easeOut" }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-full z-10 mt-2 flex w-44 flex-col gap-0.5 rounded-card border border-border bg-surface p-2 shadow-[0_20px_40px_-24px_rgba(76,59,48,0.45)]"
          >
            {CATEGORIES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                role="option"
                aria-selected={entry.value === category}
                onClick={() => {
                  onChange(entry.value);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] uppercase tracking-[0.18em] transition hover:bg-accent-muted/40 hover:text-ink ${
                  entry.value === category ? "text-accent" : "text-ink-muted"
                }`}
              >
                <CategoryGlyph category={entry.value} className="h-3.5 w-3.5 shrink-0" />
                {entry.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
