"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(app)/actions";
import { AdminMenuItems } from "@/components/nav/AdminMenuItems";
import { NavLink } from "@/components/nav/NavLink";

/**
 * Desktop-only. Settings / Keeper links / "Step out for now" tucked behind
 * one affordance instead of sitting in the flat inline row next to
 * Bookshelf/Bucket list/Vault — see BUG-004: a flat equal-weight link row is
 * itself the "broad navigation" pattern the Experience Direction Invariants
 * ask to reduce, and it only reads more like a dashboard as admin-only pages
 * multiply. Bookshelf/Bucket list/Vault stay inline in `AppHeader` since
 * those are the primary destinations; everything utility-shaped lives here,
 * folding admin items in directly rather than nesting a dropdown inside a
 * dropdown (same convention `MobileNavMenu` already uses).
 */
export function DesktopMoreMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

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
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? "Close menu" : "More"}
        className="ink-legible cursor-pointer text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        More
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8, scale: prefersReducedMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8, scale: prefersReducedMotion ? 1 : 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.22, ease: "easeOut" }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-2 rounded-card border border-border bg-surface p-3 shadow-[0_20px_40px_-24px_rgba(76,59,48,0.45)]"
          >
            <NavLink
              href="/settings"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition hover:bg-accent-muted/40"
              activeClassName="bg-accent-muted/40 text-ink"
              inactiveClassName="text-ink-muted hover:text-ink"
            >
              Settings
            </NavLink>

            {isAdmin && (
              <div className="border-t border-border pt-2">
                <AdminMenuItems onNavigate={() => setOpen(false)} />
              </div>
            )}

            <form action={signOut} className="border-t border-border pt-2">
              <button
                type="submit"
                className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:bg-accent-muted/40 hover:text-ink"
              >
                Step out for now
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
