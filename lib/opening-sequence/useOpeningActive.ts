"use client";

import { usePathname } from "next/navigation";
import { useCelebrating } from "@/lib/celebration/useCelebrating";
import { useOpeningSeen } from "./useOpeningSeen";

/**
 * Is the monthsary opening ceremony (the fixed, full-screen overlay in
 * `HomeCover`/`MonthsaryOpening`) plausibly on screen right now?
 *
 * The ceremony only ever mounts on `/`, only on a celebration day (or preview
 * override), and only until its "Skip intro" / natural completion fires —
 * after that `useOpeningSeen()` flips to `"seen"` for the rest of the visit.
 * Reading the same two hooks `HomeCover` already uses gives any other
 * component (e.g. the header) the same answer without needing a shared
 * context: both read the same `localStorage`/`sessionStorage`, so two
 * components that mount around the same time agree.
 *
 * Deliberately does not try to track the ceremony's exit-fade specifically
 * (`introGone` in `HomeCover`) — the "Skip intro" button itself unmounts the
 * instant the intro completes, so there is nothing left to overlap with once
 * that happens.
 */
export function useOpeningActive(): boolean {
  const pathname = usePathname();
  const celebrating = useCelebrating();
  const openingSeen = useOpeningSeen();

  return pathname === "/" && celebrating && openingSeen === "unseen";
}
