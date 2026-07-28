"use client";

import { useCelebrationOverride } from "./useCelebrationOverride";

/**
 * Floating dev-only fallback for the Celebration Mode preview, for a
 * non-admin account testing locally in development.
 *
 * The admin's copy of these controls lives inside the Keeper menu in
 * `AppHeader`/`AdminMenu` (`CelebrationControls`) — always available in
 * production, not just in development, per the original reason for showing
 * this to one person: rehearsing the ceremony on a real phone, on the real
 * deployment. This widget needs its own pill/card look (unlike the flat menu
 * version) because it floats directly over the ambient scene with nothing
 * else around it for legibility.
 */
export function CelebrationDevToggle({ isAdmin = false }: { isAdmin?: boolean }) {
  const { override, apply, playCeremony } = useCelebrationOverride();

  if (process.env.NODE_ENV !== "development" || isAdmin) return null;

  const optionClass = (active: boolean) =>
    active ? "font-semibold text-accent" : "text-ink-muted hover:text-ink";

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={playCeremony}
        className="rounded-full border border-accent bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent shadow-sm transition hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
      >
        ▸ Play the ceremony
      </button>

      <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs shadow-sm">
        <span className="text-ink-muted">Celebration:</span>
        <button type="button" onClick={() => apply(true)} className={optionClass(override === true)}>
          On
        </button>
        <button type="button" onClick={() => apply(false)} className={optionClass(override === false)}>
          Off
        </button>
        <button type="button" onClick={() => apply(null)} className={optionClass(override === null)}>
          Auto
        </button>
      </div>
    </div>
  );
}
