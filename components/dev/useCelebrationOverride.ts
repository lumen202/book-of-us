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
 * Shared logic behind the Celebration Mode preview, presented two different
 * ways: a flat menu section inside the Keeper dropdown (`CelebrationControls`)
 * and a floating widget for non-admin local dev (`CelebrationDevToggle`).
 *
 * `lazyInit` controls how `override` gets its first value:
 *
 * - `false` (default, for `CelebrationDevToggle`): that widget is mounted
 *   unconditionally at the app root, so it exists during SSR/first paint,
 *   where there is no `localStorage` to read. Starting at `null` and syncing
 *   the real value in an effect avoids a hydration mismatch, at the cost of a
 *   one-render flash to "Auto" on mount.
 * - `true` (for `CelebrationControls`): that one only ever mounts client-side,
 *   after the Keeper menu is clicked open — never during SSR or first paint —
 *   so there's no hydration risk, and reading `localStorage` synchronously up
 *   front avoids the flash to "Auto" that briefly showed the wrong option
 *   highlighted every time the menu opened.
 */
export function useCelebrationOverride(options?: { lazyInit?: boolean }) {
  const lazyInit = options?.lazyInit ?? false;
  const [override, setOverride] = useState<boolean | null>(() => (lazyInit ? readStoredOverride() : null));

  useEffect(() => {
    if (lazyInit) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverride(readStoredOverride());
  }, [lazyInit]);

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

  /**
   * Same as `playCeremony`, but with `previewAsPartner=1` — the ceremony then shows the current
   * viewer's *own* saved letter/whisper (what they wrote for their partner) instead of the
   * incoming side, which is the only way to check your own draft before your partner ever sees it.
   * See `app/(app)/page.tsx`.
   */
  function previewPartnerCeremony() {
    forgetOpeningSeen();
    window.localStorage.setItem(OVERRIDE_KEY, "true");
    window.location.href = "/?celebrate=1&previewAsPartner=1";
  }

  return { override, apply, playCeremony, previewPartnerCeremony };
}
