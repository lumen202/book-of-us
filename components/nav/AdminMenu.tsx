"use client";

import { useEffect, useRef, useState } from "react";
import { AdminMenuItems } from "@/components/nav/AdminMenuItems";

/** Desktop-only: the mobile hamburger menu (`MobileNavMenu`) folds these same items in directly instead of nesting a dropdown inside a dropdown. */
export function AdminMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        className="ink-legible cursor-pointer text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        Keeper
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-2 rounded-card border border-border bg-surface p-3 shadow-[0_20px_40px_-24px_rgba(76,59,48,0.45)]">
          <AdminMenuItems onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
