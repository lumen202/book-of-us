"use client";

import { useSyncExternalStore } from "react";

/** No store to subscribe to — the value only ever changes once, at hydration. */
const noop = () => () => {};

/**
 * `false` on the server and during the hydration render, `true` from the first
 * render after hydration onwards.
 *
 * For the small number of things that are genuinely allowed to differ between
 * the server's HTML and what the reader ends up seeing — anything drawn from
 * `Math.random()`, chiefly. Rendering those directly makes React tear the tree
 * down with "server rendered text didn't match the client" (which is exactly
 * what `LuckyDraw` used to do, on every load of `/places`).
 *
 * `useSyncExternalStore` rather than the usual `useState(false)` +
 * `useEffect(() => setMounted(true))`: it reads its server snapshot during SSR
 * and its client snapshot afterwards, which is the same result *without* a
 * setState inside an effect — a cascading extra render that React's own lint
 * rule (`react-hooks/set-state-in-effect`) rightly flags.
 *
 * Use it to decide **what to render**, not to gate work. Draw the random value
 * in a `useState` initializer as normal and simply don't render it until this
 * returns `true`; the hydration render then matches the server exactly, and the
 * real value appears one frame later.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
