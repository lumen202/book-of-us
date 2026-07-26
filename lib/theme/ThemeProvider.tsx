"use client";

import { useEffect } from "react";
import { getSeason } from "./tokens";

/**
 * Sets data-season on <html> from the current date. A client effect (not a
 * server computation) so the book's mood updates if a tab stays open across
 * a season boundary, matching how Celebration Mode will later need to flip
 * data-celebration mid-session without a page reload.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.season = getSeason();
  }, []);

  return <>{children}</>;
}
