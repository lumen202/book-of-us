"use client";

import { MotionConfig } from "framer-motion";

/**
 * `reducedMotion="user"` makes every Framer Motion animation in the app defer
 * to the OS-level "reduce motion" setting automatically, so accessibility is
 * a built-in variant rather than a separate code path each component has to
 * remember to check.
 */
export function ReducedMotionConfig({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
