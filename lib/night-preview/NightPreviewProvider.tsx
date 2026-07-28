"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const NIGHT_PREVIEW_KEY = "book-of-us:night-preview";

type NightPreviewContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
};

const NightPreviewContext = createContext<NightPreviewContextValue | null>(null);

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NIGHT_PREVIEW_KEY) === "true";
}

/**
 * A purely cosmetic night-backdrop preview, independent of Celebration Mode.
 *
 * Deliberately its own `data-night-preview` attribute rather than reusing
 * `data-celebration` — that attribute also drives confetti, the ceremony copy
 * and the look-back photo fetch (see `useCelebrating`/`isCelebrationDay`),
 * none of which this toggle should ever touch. `globals.css` extends the
 * same visual-only selectors (the garden pigments, `.night-sky`,
 * `.lantern-flame`, `.ambient-sun*`, `.ink-legible`, `.scene-card`) to also
 * match `[data-night-preview="true"]`, so enabling this looks identical to
 * Celebration Mode's night without being it.
 */
export function NightPreviewProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(readStored());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.nightPreview = String(enabled);
  }, [enabled]);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled: (next: boolean) => {
        window.localStorage.setItem(NIGHT_PREVIEW_KEY, String(next));
        setEnabled(next);
      },
    }),
    [enabled],
  );

  return <NightPreviewContext.Provider value={value}>{children}</NightPreviewContext.Provider>;
}

export function useNightPreview(): NightPreviewContextValue {
  const context = useContext(NightPreviewContext);
  if (!context) {
    throw new Error("useNightPreview must be used within a NightPreviewProvider.");
  }
  return context;
}
