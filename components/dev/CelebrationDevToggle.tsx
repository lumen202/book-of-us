"use client";

import { useEffect, useState } from "react";
import { OVERRIDE_KEY } from "@/lib/celebration/useCelebrating";
import { forgetOpeningSeen } from "@/lib/opening-sequence/useOpeningSeen";

function readStoredOverride(): boolean | null {
  const stored = window.localStorage.getItem(OVERRIDE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return null;
}

/**
 * Dev-only widget for previewing Celebration Mode without waiting for the
 * 5th of the month. Renders nothing in production builds. Reloads the page
 * on change because useCelebrating() only reads its override once per mount
 * (a lazy useState initializer, not something that reacts live) — see
 * lib/celebration/useCelebrating.ts.
 */
export function CelebrationDevToggle() {
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    // Unlike useCelebrating()'s boolean, this state feeds visible className —
    // starting at null (matching what SSR renders, since there's no
    // localStorage on the server) and syncing the real value only after
    // mount avoids a hydration mismatch. The one-time extra render this
    // causes is the point, not a bug the lint rule should flag here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverride(readStoredOverride());
  }, []);

  if (process.env.NODE_ENV !== "development") return null;

  function apply(value: boolean | null) {
    // The whole point of flipping this is to watch the opening again, and the
    // reload below keeps sessionStorage — so clear the "already played this
    // visit" flag or the preview shows the page with no ceremony.
    forgetOpeningSeen();
    if (value === null) {
      window.localStorage.removeItem(OVERRIDE_KEY);
    } else {
      window.localStorage.setItem(OVERRIDE_KEY, String(value));
    }
    window.location.reload();
  }

  const optionClass = (active: boolean) =>
    active ? "font-semibold text-accent" : "text-ink-muted hover:text-ink";

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <span className="text-ink-muted">Celebration preview:</span>
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
  );
}
