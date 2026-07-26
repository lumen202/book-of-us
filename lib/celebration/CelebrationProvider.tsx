"use client";

import { useEffect } from "react";
import { useCelebrating } from "./useCelebrating";

/** Mirrors ThemeProvider's pattern: sets data-celebration on <html> from a client hook. */
export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const celebrating = useCelebrating();

  useEffect(() => {
    document.documentElement.dataset.celebration = String(celebrating);
  }, [celebrating]);

  return <>{children}</>;
}
