"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The things that live here: butterflies, bees, birds, dragonflies, ladybugs,
 * fireflies, blossom petals and leaves.
 *
 * The point of this hook is what it *refuses* to do. An infinite CSS animation
 * gives you a butterfly every N seconds forever, and a viewer works out the
 * period within about two cycles — after which the garden stops being a place
 * and becomes a loop. So each kind of life runs its own independent timer with
 * its own random interval, and every appearance is a fresh one-shot element
 * with its own height, speed, direction, drift and — for the things that fly
 * properly — its own wandering route across the screen. The intervals share no
 * period, so the aggregate never resolves into a rhythm.
 *
 * Two motions, and the difference matters:
 *
 * - **`cross`** — a straight glide with a little rise or fall. Birds, petals,
 *   leaves, dragonflies. Things that are going somewhere, or that are simply
 *   being carried.
 * - **`wander`** — five waypoints, eased between, so the creature drifts up and
 *   down and doubles back on itself. Butterflies, bees, fireflies. A butterfly
 *   that flies in a straight line is a moth-shaped bullet; the wandering *is*
 *   the butterfly, and it is the single detail that makes the garden feel
 *   inhabited rather than decorated.
 *
 * This is the one part of the backdrop that is not seeded and not rendered on
 * the server: it only starts after mount, so there is nothing for hydration to
 * disagree about, and unpredictability is the entire feature.
 *
 * Under `prefers-reduced-motion` no timers are started at all and the hook
 * returns an empty list — the scene
 * keeps its own static flock and its resting
 * butterflies instead, so the composition still reads as finished and inhabited.
 */

export type LifeKind =
  | "bird"
  | "butterfly"
  | "bee"
  | "dragonfly"
  | "ladybug"
  | "firefly"
  | "petal"
  | "leaf";

export type Waypoint = { x: number; y: number };

export type LifeEvent = {
  id: number;
  kind: LifeKind;
  motion: "cross" | "wander";
  /** Where it enters, in vh from the top of the viewport. */
  top: number;
  scale: number;
  /** Seconds to cross the viewport. */
  duration: number;
  /** 1 = left to right. */
  direction: 1 | -1;
  /** `cross` only: vertical travel across the crossing, in vh. Negative rises. */
  rise: number;
  /** `wander` only: five points in vw / vh, relative to `top`. */
  route: Waypoint[];
  opacity: number;
  /** Index into the petal palette. */
  hue: number;
  /** Degrees of rotation across the crossing. */
  spin: number;
};

/**
 * Seconds between appearances, per kind.
 *
 * Tuned so that something is nearly always happening somewhere — the brief asks
 * for a world that always feels alive — while any *individual* kind stays rare
 * enough to be a small event when it shows up. None of these ranges are
 * multiples of each other, which is what stops the kinds drifting into sync.
 *
 * **These were all roughly 1.5x longer, and the garden read as empty.** The
 * arithmetic that matters is `duration / mean interval` = how many of that kind
 * are on screen at once; summed across kinds it was ~6.6, which sounds
 * populated and did not look it, because most of those six are small, faint,
 * and deliberately near the edges. It now sums to ~10 against a cap of 14.
 *
 * The individual-rarity rule still holds: no single kind exceeds ~2 concurrent,
 * so a bird is still an event. What changed is how many *kinds* are present at
 * the same time, which is what "inhabited" actually reads as.
 */
const CADENCE: Record<LifeKind, [number, number]> = {
  petal: [7, 17],
  butterfly: [11, 25],
  bee: [13, 31],
  bird: [15, 29],
  leaf: [23, 53],
  dragonfly: [29, 61],
  firefly: [37, 79],
  ladybug: [59, 127],
};

/**
 * Anything more than this on screen at once stops being "occasional".
 *
 * Two caps, because the phone is where this gets expensive. Each creature is a
 * handful of nodes with an infinite wing animation, and on touch they are
 * running over a scene that has already given up its parallax and two of its
 * three paper passes to stay smooth (see the `(pointer: coarse)` block in
 * globals.css). Desktop can afford the fuller garden; the phone keeps roughly
 * the density it had.
 */
const MAX_CONCURRENT = 14;
const MAX_CONCURRENT_TOUCH = 9;

/** Five waypoints wandering across the frame, with the vertical meander scaled
 *  by `amplitude` and the whole thing biased in the direction of travel. */
function route(direction: 1 | -1, amplitude: number, drift: number): Waypoint[] {
  const from = direction === 1 ? -14 : 114;
  const to = direction === 1 ? 114 : -14;
  return Array.from({ length: 5 }, (_, i) => {
    const t = i / 4;
    return {
      // Progress along x wobbles too, so it sometimes almost stops and
      // sometimes hurries — never a constant speed.
      x: from + (to - from) * (t + (i === 0 || i === 4 ? 0 : (Math.random() - 0.5) * 0.14)),
      y: drift * t + (i === 0 || i === 4 ? 0 : (Math.random() - 0.5) * 2 * amplitude),
    };
  });
}

function spawn(kind: LifeKind, id: number): LifeEvent {
  const r = Math.random;
  const direction: 1 | -1 = r() < 0.58 ? 1 : -1;
  const base = { id, kind, direction, route: [] as Waypoint[], rise: 0, spin: 0, hue: 0 };

  switch (kind) {
    case "bird":
      // High, small, unhurried, and always well above the reading band.
      return {
        ...base, motion: "cross",
        top: 6 + r() * 20,
        scale: 0.45 + r() * 0.5,
        duration: 28 + r() * 22,
        rise: -(4 + r() * 12),
        opacity: 0.28 + r() * 0.18,
      };

    case "butterfly":
      return {
        ...base, motion: "wander",
        top: 46 + r() * 36,
        scale: 0.75 + r() * 0.65,
        duration: 22 + r() * 20,
        route: route(direction, 5 + r() * 7, (r() - 0.6) * 16),
        opacity: 0.62 + r() * 0.3,
        hue: Math.floor(r() * 4),
      };

    case "bee":
      // Low, quick, busy — down among the flowers rather than over them.
      return {
        ...base, motion: "wander",
        top: 66 + r() * 24,
        scale: 0.5 + r() * 0.35,
        duration: 13 + r() * 11,
        route: route(direction, 3 + r() * 5, (r() - 0.5) * 8),
        opacity: 0.55 + r() * 0.25,
      };

    case "dragonfly":
      return {
        ...base, motion: "cross",
        top: 60 + r() * 24,
        scale: 0.6 + r() * 0.4,
        duration: 12 + r() * 8,
        rise: (r() - 0.5) * 10,
        opacity: 0.34 + r() * 0.2,
      };

    case "ladybug":
      // Barely moving, right down in the grass. Most visitors will never
      // consciously notice one, which is the correct amount of ladybug.
      return {
        ...base, motion: "cross",
        top: 84 + r() * 10,
        scale: 0.5 + r() * 0.3,
        duration: 70 + r() * 60,
        rise: (r() - 0.5) * 3,
        opacity: 0.7,
      };

    case "firefly":
      return {
        ...base, motion: "wander",
        top: 62 + r() * 30,
        scale: 0.6 + r() * 0.5,
        duration: 26 + r() * 22,
        route: route(direction, 6 + r() * 8, (r() - 0.7) * 14),
        opacity: 0.75,
      };

    case "leaf":
      return {
        ...base, motion: "cross",
        top: -6 + r() * 20,
        scale: 0.8 + r() * 0.7,
        duration: 24 + r() * 22,
        rise: 65 + r() * 45,
        opacity: 0.45 + r() * 0.3,
        hue: Math.floor(r() * 4),
        spin: (r() < 0.5 ? -1 : 1) * (180 + r() * 620),
      };

    case "petal":
    default:
      return {
        ...base, motion: "cross",
        top: 16 + r() * 62,
        scale: 0.45 + r() * 0.6,
        duration: 20 + r() * 20,
        rise: 10 + r() * 42,
        opacity: 0.45 + r() * 0.4,
        hue: Math.floor(r() * 4),
        spin: (r() < 0.5 ? -1 : 1) * (120 + r() * 420),
      };
  }
}

export function useAmbientLife(): LifeEvent[] {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cap = window.matchMedia("(pointer: coarse)").matches
      ? MAX_CONCURRENT_TOUCH
      : MAX_CONCURRENT;

    const timers = new Set<ReturnType<typeof setTimeout>>();

    const later = (fn: () => void, seconds: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, seconds * 1000);
      timers.add(t);
    };

    const schedule = (kind: LifeKind, firstDelay: number) => {
      later(() => {
        const [min, max] = CADENCE[kind];

        // A backgrounded tab would otherwise queue up a swarm to release all at
        // once when the reader comes back.
        if (!document.hidden) {
          const event = spawn(kind, (nextId.current += 1));
          setEvents((current) => (current.length >= cap ? current : [...current, event]));
          later(
            () => setEvents((current) => current.filter((e) => e.id !== event.id)),
            event.duration + 1,
          );
        }

        schedule(kind, min + Math.random() * (max - min));
      }, firstDelay);
    };

    /**
     * Staggered first appearances — and this stagger, not the cadence, was the
     * thing that made the garden feel empty.
     *
     * The steady state was always reasonably busy, but nothing reaches it for
     * the first minute: a bird used to wait 19–37s for its *first* crossing, a
     * dragonfly 52–86s, a firefly 61–101s. Plenty of visits are shorter than
     * that, so the garden many arrivals actually saw was two petals and a
     * butterfly. Every first delay is now roughly a third of what it was, and
     * the whole cast has appeared at least once inside ~40 seconds.
     *
     * They still arrive in the same order, and the rarer things still hold back
     * — a ladybug turning up in the first two seconds would spend the one
     * detail most visitors are never meant to consciously notice.
     *
     * Note that `StorybookSky` is mounted once in the app layout, so these
     * timers survive client-side navigation; the cold start is paid once per
     * full page load, not per page visited.
     */
    schedule("petal", 1 + Math.random() * 3);
    schedule("butterfly", 2 + Math.random() * 4);
    schedule("bee", 5 + Math.random() * 7);
    schedule("bird", 6 + Math.random() * 9);
    schedule("leaf", 12 + Math.random() * 14);
    schedule("dragonfly", 18 + Math.random() * 20);
    schedule("firefly", 24 + Math.random() * 24);
    schedule("ladybug", 30 + Math.random() * 30);

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  return events;
}
