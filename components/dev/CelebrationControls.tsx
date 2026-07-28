"use client";

import { useCelebrationOverride } from "./useCelebrationOverride";

const OPTIONS = [
  { label: "On", value: true },
  { label: "Off", value: false },
  { label: "Auto", value: null },
] as const;

/**
 * Flat, list-styled Celebration Mode preview — matches the "Removed" /
 * "Passwords" links above it in the Keeper menu instead of standing out as a
 * separate pill-shaped widget. See `CelebrationDevToggle` for the other
 * presentation of the same `useCelebrationOverride` logic.
 */
export function CelebrationControls() {
  const { override, apply, playCeremony } = useCelebrationOverride({ lazyInit: true });

  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 text-[10px] uppercase tracking-[0.2em] text-ink-muted/70">Celebration</span>

      <button
        type="button"
        onClick={playCeremony}
        className="rounded-lg px-3 py-2 text-left text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:bg-accent-muted/40 hover:text-ink"
      >
        Play the ceremony
      </button>

      <div className="flex gap-1 px-3">
        {OPTIONS.map(({ label, value }) => {
          const active = override === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => apply(value)}
              aria-pressed={active}
              className={`flex-1 rounded-lg py-1.5 text-[10px] uppercase tracking-[0.15em] transition ${
                active ? "bg-accent text-surface" : "text-ink-muted hover:bg-accent-muted/40 hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
