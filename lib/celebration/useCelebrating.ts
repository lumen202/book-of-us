"use client";

import { useState } from "react";
import { useServerCelebrationDay } from "./CelebrationDayContext";

export const OVERRIDE_KEY = "book-of-us:celebration-override";

/**
 * Dev-only preview override: visiting `?celebrate=1` or `?celebrate=0` pins
 * Celebration Mode on/off (persisted in localStorage so it survives
 * navigation without repeating the query param). Real usage never sets this
 * — only a manual review needs to see Celebration Mode outside the 5th.
 */
function readOverride(): boolean | null {
  if (typeof window === "undefined") return null;

  const param = new URLSearchParams(window.location.search).get("celebrate");
  if (param === "1" || param === "0") {
    const value = param === "1";
    window.localStorage.setItem(OVERRIDE_KEY, String(value));
    return value;
  }

  const stored = window.localStorage.getItem(OVERRIDE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return null;
}

/**
 * A lazy initializer (not an effect) is enough here: this hook's return
 * value is only ever read inside other effects downstream (never directly
 * in JSX), so there's no hydration-mismatch risk in letting the client's
 * first render already see the real `window`-backed value.
 *
 * The non-override case defers to `useServerCelebrationDay()` (the server's
 * clock, from `app/(app)/layout.tsx`) rather than asking the browser's own
 * `Date` — see `CelebrationDayContext` for why that distinction matters.
 */
export function useCelebrating(): boolean {
  const serverCelebrationDay = useServerCelebrationDay();
  const [celebrating] = useState(() => readOverride() ?? serverCelebrationDay);
  return celebrating;
}
