"use client";

import { useEffect, useRef } from "react";

/**
 * Gives a modal-like layer (a memory's detail view, its full-screen photo,
 * the vault's lightbox) its own entry in browser history, so pressing back
 * closes that layer instead of falling through to whatever page navigation
 * opened it. Call unconditionally from a component that is only ever mounted
 * while the layer is open — mounting is what pushes the entry.
 *
 * Deliberately does *not* call `history.back()` when the layer closes by
 * some other means (×, backdrop, Escape): `back()` resolves asynchronously,
 * and React 18 Strict Mode's dev-only mount→cleanup→remount (synchronous,
 * within one commit) raced it against the remount's own `pushState` — the
 * deferred `back()` popped the wrong entry and fired a spurious `popstate`
 * that closed the layer the instant it opened. Leaving the entry behind
 * costs at most one extra press of back after closing this way (that press
 * lands on a same-URL entry and is a visible no-op, then the next press
 * behaves normally) — a fine trade for not intermittently breaking "open".
 */
export function useCloseOnBack(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    window.history.pushState({ layer: true }, "");

    function onPopState() {
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
}
