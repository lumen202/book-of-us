"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useBodyScrollLock } from "@/lib/navigation/useBodyScrollLock";
import type { Place } from "@/lib/places/types";
import { PlaceRevealCard } from "./PlaceRevealCard";
import { RevealCardShell } from "./RevealCardShell";

/**
 * The modal chrome around a reveal — same fixed-backdrop, `scene-card` panel
 * shape as `CompletionModal.tsx`, because this is the same emotional beat
 * ("tap something, the book hands you a surprise") wearing a different hat.
 * Scrolls internally on short screens; the reveal has too much in it (image,
 * facts, five actions) to guarantee it fits without scrolling on a phone in
 * landscape, or at a phone's pinch-zoomed-in scale, where the effective
 * viewport shrinks further still — the primary way this app is actually used.
 *
 * The centering wrapper is a **separate element from the scrollable one** —
 * `overflow-y-auto` and `flex items-center justify-center` on the *same*
 * element clips the top of an overflowing centered child in most engines
 * (centering an item taller than its container pushes it equally past both
 * edges, and `overflow: auto` on that same box only ever scrolls it back to
 * flush-with-the-near-edge, never past centre to the true top). Splitting
 * scrolling (outer, plain block flow) from centering (inner, `min-h-full`
 * flex) is the standard fix — the outer element's scrollable content height
 * is then the inner wrapper's real height, top to bottom, so both ends of a
 * tall card are reachable by scrolling either direction.
 */
export function PlaceRevealOverlay({
  place,
  loading,
  loadingLabel,
  wishlisted,
  visited,
  onClose,
  onAnother,
  anotherLabel,
}: {
  place: Place | null;
  loading: boolean;
  loadingLabel: string;
  wishlisted: boolean;
  visited: boolean;
  onClose: () => void;
  onAnother?: () => void;
  anotherLabel?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const open = loading || place !== null;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={place ? `Destination: ${place.name}` : loadingLabel}
          className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-[2px]"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* See the header comment: centering lives here, scrolling lives on the parent — kept separate so a card taller than the viewport stays fully reachable. */}
          <div className="flex min-h-full items-center justify-center p-4 py-10">
            <motion.div
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-md"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24, scale: prefersReducedMotion ? 1 : 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 12, scale: prefersReducedMotion ? 1 : 0.98 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              {/*
               * Sits *outside* the card's own top-right corner (negative
               * offset, like the photo-remove button in CompletionModal),
               * not inset within the padding — the reveal's hero photo
               * fills almost the entire padded width right up to the top,
               * so an inset button at `right-4 top-4` landed partly
               * underneath it and, against a light sky-coloured photo, all
               * but vanished. Outside the card there is never a photo
               * behind it, only the blurred dark backdrop, so the light
               * circle always reads.
               */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-base leading-none text-ink-muted shadow-[0_6px_14px_-4px_rgba(76,59,48,0.55)] transition hover:scale-110 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
              >
                ×
              </button>

              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RevealCardShell>
                      <div className="flex flex-col items-center gap-4 py-16">
                        <span
                          aria-hidden
                          className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent motion-reduce:animate-none"
                        />
                        <p className="font-serif text-lg italic text-ink-muted">{loadingLabel}</p>
                      </div>
                    </RevealCardShell>
                  </motion.div>
                ) : place ? (
                  <motion.div
                    key={place.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <PlaceRevealCard
                      place={place}
                      wishlisted={wishlisted}
                      visited={visited}
                      onAnother={onAnother}
                      anotherLabel={anotherLabel}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
