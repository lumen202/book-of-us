"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(app)/actions";
import { AdminMenuItems } from "@/components/nav/AdminMenuItems";
import { NavLink } from "@/components/nav/NavLink";
import { useOpeningActive } from "@/lib/opening-sequence/useOpeningActive";

/**
 * Everything in the header's right-hand nav, collapsed behind one hamburger
 * button on narrow screens — "Bucket list" / "Settings" / "Keeper" / "Step
 * out for now" side by side was clumping on Android as admin-only pages
 * multiplied. `AppHeader` hides the inline nav below `sm` and shows this
 * instead; above `sm` this returns null and the inline nav takes over.
 */
export function MobileNavMenu({ isAdmin, isDemo = false }: { isAdmin: boolean; isDemo?: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // The ceremony's "Skip intro" button sits top-right, same corner as this
  // hamburger — hide it for the ceremony's duration rather than let them
  // overlap. See the hook for why this doesn't need lifted/shared state.
  const openingActive = useOpeningActive();
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

  if (openingActive) return null;

  return (
    <div ref={containerRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? "Close menu" : "Open menu"}
        className="ink-legible flex cursor-pointer flex-col items-end gap-1.5 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="block h-[1.5px] w-6 bg-current" />
        <span className="block h-[1.5px] w-6 bg-current" />
        <span className="block h-[1.5px] w-4 bg-current" />
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
            <div className="flex flex-col gap-1">
              <NavLink
                href="/"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition hover:bg-accent-muted/40"
                activeClassName="bg-accent-muted/40 text-ink"
                inactiveClassName="text-ink-muted hover:text-ink"
              >
                Bookshelf
              </NavLink>
              <NavLink
                href="/bucket-list"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition hover:bg-accent-muted/40"
                activeClassName="bg-accent-muted/40 text-ink"
                inactiveClassName="text-ink-muted hover:text-ink"
              >
                Bucket list
              </NavLink>
              <NavLink
                href="/vault"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition hover:bg-accent-muted/40"
                activeClassName="bg-accent-muted/40 text-ink"
                inactiveClassName="text-ink-muted hover:text-ink"
              >
                Vault
              </NavLink>
              <NavLink
                href="/settings"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition hover:bg-accent-muted/40"
                activeClassName="bg-accent-muted/40 text-ink"
                inactiveClassName="text-ink-muted hover:text-ink"
              >
                Settings
              </NavLink>
            </div>

            {isAdmin && (
              <div className="border-t border-border pt-2">
                <AdminMenuItems onNavigate={() => setOpen(false)} isDemo={isDemo} />
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
