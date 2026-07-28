"use client";

import { useNightPreview } from "@/lib/night-preview/NightPreviewProvider";

/**
 * A cosmetic backdrop toggle only — copy must not reference the 5th, the
 * monthsary, or "celebration" by name. That date is a surprise for one of the
 * two accounts, and this toggle sits on a page both accounts can open.
 */
export function NightModeToggle() {
  const { enabled, setEnabled } = useNightPreview();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-serif text-lg text-ink">Night view</span>
        <span className="text-sm text-ink-muted">See the garden after dark, whenever you like.</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full border border-border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          enabled ? "bg-accent" : "bg-surface"
        }`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-surface shadow-sm transition-all ${
            enabled ? "left-6 bg-surface" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
