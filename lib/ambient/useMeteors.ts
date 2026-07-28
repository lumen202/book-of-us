"use client";

import { useEffect, useRef, useState } from "react";

export type Meteor = {
  id: number;
  /** vh from the top — kept to the upper sky, same reasoning as the stars. */
  top: number;
  /** vw from the left. */
  left: number;
  /** Streak length, in vw. */
  length: number;
  /** Fall angle in degrees; the streak travels along its own rotated axis. */
  angle: number;
  /** Distance travelled along that axis, in vw. */
  travel: number;
  /** Seconds — meteors are quick, not a slow drift like the rest of the sky. */
  duration: number;
};

/** Seconds between meteors — rare enough that one is a small event, not weather. */
const CADENCE: [number, number] = [6, 16];
const MAX_CONCURRENT = 3;

function spawn(id: number): Meteor {
  const r = Math.random;
  return {
    id,
    top: 2 + r() * 22,
    // Falls toward the left, so it starts biased toward the right/centre of
    // the sky — the mirror image of a left-to-right fall's starting range.
    left: 30 + r() * 66,
    length: 9 + r() * 6,
    // 140–158°: down-and-to-the-left along the streak's own rotated axis
    // (0° would be due right, 180° due left — see NightSky.tsx for how the
    // rotation and the translate compose).
    angle: 140 + r() * 18,
    travel: 20 + r() * 12,
    duration: 0.7 + r() * 0.5,
  };
}

/**
 * A handful of falling stars — on only while the night sky is actually
 * showing (Celebration Mode, or the Settings night-view preview), never
 * during an ordinary day.
 *
 * Same one-shot-timer shape as `useAmbientLife` (spawn, animate once, remove
 * after `duration`), kept as its own hook rather than folded into that one:
 * this is gated on `active`, which the daytime creatures never need to ask
 * about, and `NightSky` itself is always mounted (day and night alike) so the
 * gate has to live in the hook, not in whether the component renders at all.
 */
export function useMeteors(active: boolean): Meteor[] {
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!active) {
      setMeteors([]);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers = new Set<ReturnType<typeof setTimeout>>();

    const later = (fn: () => void, seconds: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, seconds * 1000);
      timers.add(t);
    };

    const schedule = (delay: number) => {
      later(() => {
        if (!document.hidden) {
          const meteor = spawn((nextId.current += 1));
          setMeteors((current) => (current.length >= MAX_CONCURRENT ? current : [...current, meteor]));
          later(
            () => setMeteors((current) => current.filter((m) => m.id !== meteor.id)),
            meteor.duration + 0.5,
          );
        }
        const [min, max] = CADENCE;
        schedule(min + Math.random() * (max - min));
      }, delay);
    };

    schedule(3 + Math.random() * 5);

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [active]);

  return meteors;
}
