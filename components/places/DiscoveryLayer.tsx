"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useBodyScrollLock } from "@/lib/navigation/useBodyScrollLock";

/**
 * The room a discovery mode opens into.
 *
 * `/places` used to render every mode at once — the wheel's twenty-wedge SVG,
 * four lucky-draw cards, the weekend picker and the hidden-gem rail all mounted
 * on arrival, and "go to the wheel" meant scrolling past three other games to
 * reach it. That is a contents page pretending to be a sequence: five things
 * competing for the same attention, which is the opposite of the "reduce
 * simultaneous choices" guardrail in `experience-direction.md`.
 *
 * Now the landing page offers doors, and one opens at a time. Each mode gets
 * the whole screen and the reader's whole attention, and closing it puts them
 * back at the doors rather than halfway down a long page.
 *
 * ## Why a layer and not a route
 *
 * `/places/wheel` would work, but it would mean leaving the room: a navigation,
 * a fresh server round-trip for journal data the page already has, and back-
 * button semantics for what is really a game you picked up and will put down.
 * A layer keeps the painted world continuous underneath — you never leave the
 * compass room, you just turn to face a different part of it.
 *
 * ## `z-40`, deliberately
 *
 * Every mode inside this layer renders its own `PlaceRevealOverlay` at `z-50`.
 * That reveal is the *result* of playing the mode and has to sit above the room
 * the mode is played in, so this layer stays one step below it. Both are
 * `position: fixed`, so neither is trapped by the other's layout.
 */
export function DiscoveryLayer({
  open,
  title,
  eyebrow,
  onClose,
  children,
}: {
  open: boolean;
  /** The mode's own heading, in the same voice the landing page used to announce it. */
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

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
          aria-label={title}
          className="fixed inset-0 z-40 overflow-y-auto bg-ink/40 backdrop-blur-[2px]"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/*
           * Scrolling lives on the parent, centring on this child — the same
           * split `PlaceRevealOverlay` documents at length. A mode taller than
           * the viewport (the wheel on a short landscape phone) stays reachable
           * in both directions instead of having its top clipped.
           */}
          <div className="flex min-h-full justify-center p-4 py-10">
            <motion.div
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-2xl"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24, scale: prefersReducedMotion ? 1 : 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 12, scale: prefersReducedMotion ? 1 : 0.98 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-base leading-none text-ink-muted shadow-[0_6px_14px_-4px_rgba(76,59,48,0.55)] transition hover:scale-110 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
              >
                ×
              </button>

              <div className="flex flex-col items-center gap-8 rounded-[2rem] border border-border bg-surface px-5 py-10 shadow-[0_30px_60px_-45px_rgba(43,23,29,0.75)] sm:px-10">
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="text-[11px] uppercase tracking-[0.3em] text-accent">{eyebrow}</span>
                  <h2 className="font-serif text-2xl text-ink">{title}</h2>
                </div>
                {children}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
