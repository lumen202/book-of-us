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
 * Preview control for Celebration Mode, so the 5th can be rehearsed on any day.
 *
 * ## Why this is visible in production, to one person
 *
 * It used to be `NODE_ENV === "development"` only, which meant the one thing it
 * exists for — checking the ceremony on a real phone, on the real deployment —
 * was the one thing it could not do. It is now shown to the admin
 * (`isCurrentUserAdmin`, decided server-side in the layout) and to nobody else.
 *
 * That is a *decoration* boundary, not a security one, and it does not need to
 * be more than that: everything this widget can do — replay an intro, pretend
 * it is the 5th — is cosmetic and self-inflicted. There is no destructive action
 * behind it, so unlike the archive's admin routes there is nothing here that
 * needs `requireAdmin()` on the other end.
 *
 * ## Why "Play the ceremony" navigates instead of just setting a flag
 *
 * `?celebrate=1` has to reach the **server**, because the ceremony's look-back
 * beat is fed by photos the page fetches during render (see the note in
 * `app/(app)/page.tsx`). Flipping localStorage alone turns the ceremony on
 * client-side while the server, still believing it is an ordinary day, sends no
 * photographs — and the look back silently skips itself. A full navigation with
 * the query param is what keeps the preview honest.
 */
export function CelebrationDevToggle({ isAdmin = false }: { isAdmin?: boolean }) {
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

  if (process.env.NODE_ENV !== "development" && !isAdmin) return null;

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

  function playCeremony() {
    forgetOpeningSeen();
    window.localStorage.setItem(OVERRIDE_KEY, "true");
    // Hard navigation, not `router.push`: the server has to re-render `/` with
    // `celebrate=1` in its search params for the look-back photographs to be
    // fetched at all.
    window.location.href = "/?celebrate=1";
  }

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
