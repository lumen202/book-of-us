import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyPick, pickManyPlaces, pickPlace } from "./engine";
import type { Place } from "./types";

/**
 * Run with `npx tsx --test lib/places/*.test.ts`. `node:test` + `tsx`,
 * nothing new in `package.json` — the rest of this codebase has no test
 * suite to fit alongside, so the bar for adding a dependency just for this
 * is high; these are the pure, side-effect-free parts of the feature
 * (weighted random selection, the daily seed, the wheel's geometry), which
 * is exactly the code worth pinning down with tests regardless.
 */

function makePlace(overrides: Partial<Place> & Pick<Place, "slug">): Place {
  return {
    id: overrides.slug,
    name: overrides.slug,
    province: "Test",
    region: "Test",
    city: null,
    category: ["beach"],
    activities: [],
    tags: [],
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    budget: "light",
    difficulty: "easy",
    travelTime: ["day-trip"],
    entranceFee: { kind: "none" },
    audience: [],
    hiddenGem: false,
    featured: false,
    note: "",
    tips: [],
    latitude: 0,
    longitude: 0,
    description: "",
    history: null,
    wikipediaUrl: "",
    heroImage: {
      url: "",
      width: 1,
      height: 1,
      alt: "",
      file: "",
      credit: { artist: null, license: null, licenseUrl: null, sourceUrl: "" },
    },
    gallery: [],
    verified: true,
    rating: null,
    lastUpdated: "",
    ...overrides,
  };
}

function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

test("pickPlace returns null only when filters match nothing", () => {
  const places = [makePlace({ slug: "a", category: ["beach"] })];
  assert.equal(pickPlace(places, { category: "mountain" }), null);
  assert.equal(pickPlace([], {})?.slug, undefined);
});

test("pickPlace falls back to the full pool when everything was recently shown", () => {
  const places = [makePlace({ slug: "a" }), makePlace({ slug: "b" })];
  const excludeSlugs = new Set(["a", "b"]);
  const picked = pickPlace(places, { excludeSlugs, rng: seededRng([0.4]) });
  assert.ok(picked && ["a", "b"].includes(picked.slug));
});

test("pickPlace prefers unseen places over recently-shown ones", () => {
  const places = [makePlace({ slug: "seen" }), makePlace({ slug: "unseen" })];
  const excludeSlugs = new Set(["seen"]);
  // Any rng roll should land on "unseen" — it's the only candidate once "seen" is excluded.
  for (const roll of [0, 0.3, 0.6, 0.99]) {
    const picked = pickPlace(places, { excludeSlugs, rng: seededRng([roll]) });
    assert.equal(picked?.slug, "unseen");
  }
});

test("pickPlace respects category, hiddenGemOnly and tripLength filters together", () => {
  const places = [
    makePlace({ slug: "match", category: ["mountain"], hiddenGem: true, travelTime: ["weekend"] }),
    makePlace({ slug: "wrong-category", category: ["beach"], hiddenGem: true, travelTime: ["weekend"] }),
    makePlace({ slug: "not-hidden", category: ["mountain"], hiddenGem: false, travelTime: ["weekend"] }),
    makePlace({ slug: "wrong-trip", category: ["mountain"], hiddenGem: true, travelTime: ["day-trip"] }),
  ];
  const picked = pickPlace(places, {
    category: "mountain",
    hiddenGemOnly: true,
    tripLength: "weekend",
    rng: seededRng([0.5]),
  });
  assert.equal(picked?.slug, "match");
});

test("pickManyPlaces never repeats a slug within one draw", () => {
  const places = Array.from({ length: 5 }, (_, i) => makePlace({ slug: `p${i}` }));
  const drawn = pickManyPlaces(places, 5, { rng: Math.random });
  assert.equal(new Set(drawn.map((p) => p.slug)).size, 5);
});

test("pickManyPlaces stops rather than repeating once the pool is exhausted", () => {
  const places = Array.from({ length: 3 }, (_, i) => makePlace({ slug: `p${i}` }));
  const drawn = pickManyPlaces(places, 10, { rng: Math.random });
  assert.equal(drawn.length, 3);
});

test("dailyPick is deterministic for the same day and stable across the day", () => {
  const places = Array.from({ length: 50 }, (_, i) => makePlace({ slug: `p${i}` }));
  const morning = new Date(2026, 7, 5, 6, 0, 0);
  const night = new Date(2026, 7, 5, 23, 59, 0);
  assert.equal(dailyPick(places, morning)?.slug, dailyPick(places, night)?.slug);
});

test("dailyPick changes across different days (not a constant fallback)", () => {
  const places = Array.from({ length: 50 }, (_, i) => makePlace({ slug: `p${i}` }));
  const picks = new Set(
    Array.from({ length: 30 }, (_, d) => dailyPick(places, new Date(2026, 0, d + 1))?.slug),
  );
  // With 50 candidates and 30 distinct days, expect meaningful spread, not one repeated slug.
  assert.ok(picks.size > 10, `expected varied daily picks, got ${picks.size} distinct values`);
});

test("dailyPick returns null for an empty atlas rather than throwing", () => {
  assert.equal(dailyPick([], new Date(2026, 0, 1)), null);
});
