"use client";

import { createContext, useContext } from "react";

/**
 * The server's answer to "is today the 5th?" — `isCelebrationDay(getAppNow())`,
 * computed once in `app/(app)/layout.tsx` and handed down here.
 *
 * Every `useCelebrating()` call site used to answer this question itself, from
 * the *browser's* own clock. That's a second, independent clock from the one
 * `app/(app)/page.tsx` uses to decide whether to fetch the look-back photos —
 * and the two can disagree around midnight when the server and the visitor
 * are in different timezones. When they did, the ceremony still played (the
 * client's clock said yes) with no photo sequence (the server's clock said
 * no, so it never fetched any prints). Reading the server's own answer here
 * instead keeps every consumer on the same clock the photo fetch used.
 */
const CelebrationDayContext = createContext<boolean | null>(null);

export function CelebrationDayProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <CelebrationDayContext.Provider value={value}>{children}</CelebrationDayContext.Provider>;
}

export function useServerCelebrationDay(): boolean {
  const value = useContext(CelebrationDayContext);
  if (value === null) {
    throw new Error("useServerCelebrationDay must be used within a CelebrationDayProvider");
  }
  return value;
}
