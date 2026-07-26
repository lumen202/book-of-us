"use client";

import { useEffect, useState } from "react";

export const OPENING_SEEN_KEY = "book-of-us:opening-seen";

/** `unknown` until after mount — see the hook below for why that matters. */
export type OpeningSeenStatus = "unknown" | "seen" | "unseen";

function read(): boolean {
  try {
    return window.sessionStorage.getItem(OPENING_SEEN_KEY) === "true";
  } catch {
    // Private-mode / disabled storage: treat it as unseen. Replaying the
    // opening is a much smaller failure than never showing it.
    return false;
  }
}

/**
 * Has the opening already played during this visit?
 *
 * Scoped to `sessionStorage`, not `localStorage`: the ceremony belongs to
 * *arriving*, so a fresh visit should get it, but walking back from a chapter
 * to the shelf should not — before this existed, "Back to the shelf" replayed
 * the whole envelope sequence, which made the shelf feel unreachable.
 *
 * Returns `unknown` on the first render because the server can't see
 * `sessionStorage`; the caller renders nothing until this resolves so SSR and
 * the client's pre-effect render stay identical. Same pattern, and the same
 * reasoning, as the `mounted` flag in `OpeningSequence`.
 */
export function useOpeningSeen(): OpeningSeenStatus {
  const [status, setStatus] = useState<OpeningSeenStatus>("unknown");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(read() ? "seen" : "unseen");
  }, []);

  return status;
}

export function markOpeningSeen(): void {
  try {
    window.sessionStorage.setItem(OPENING_SEEN_KEY, "true");
  } catch {
    // Nothing to do — worst case the opening plays again.
  }
}

/** Lets the next visit to `/` replay the opening. Used by the dev toggle. */
export function forgetOpeningSeen(): void {
  try {
    window.sessionStorage.removeItem(OPENING_SEEN_KEY);
  } catch {
    // Nothing to do.
  }
}
