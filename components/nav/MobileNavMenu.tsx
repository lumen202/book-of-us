"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(app)/actions";
import { AdminMenuItems } from "@/components/nav/AdminMenuItems";
import { useOpeningActive } from "@/lib/opening-sequence/useOpeningActive";

/**
 * Everything in the header's right-hand nav, collapsed behind one hamburger
 * button on narrow screens — "Bucket list" / "Settings" / "Keeper" / "Step
 * out for now" side by side was clumping on Android as admin-only pages
 * multiplied. `AppHeader` hides the inline nav below `sm` and shows this
 * instead; above `sm` this returns null and the inline nav takes over.
 */
export function MobileNavMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // The ceremony's "Skip intro" button sits top-right, same corner as this
  // hamburger — hide it for the ceremony's duration rather than let them
  // overlap. See the hook for why this doesn't need lifted/shared state.
  const openingActive = useOpeningActive();

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

      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-2 rounded-card border border-border bg-surface p-3 shadow-[0_20px_40px_-24px_rgba(76,59,48,0.45)]">
          <div className="flex flex-col gap-1">
            <Link
              href="/bucket-list"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:bg-accent-muted/40 hover:text-ink"
            >
              Bucket list
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:bg-accent-muted/40 hover:text-ink"
            >
              Settings
            </Link>
          </div>

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
        </div>
      )}
    </div>
  );
}
