import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWheelSegments, computeSpinRotation, spinToCategory } from "./wheel";
import type { Place } from "./types";

function makePlace(category: Place["category"][number]): Place {
  return {
    id: category,
    slug: category,
    name: category,
    province: "",
    region: "",
    city: null,
    category: [category],
    activities: [],
    tags: [],
    bestMonths: [],
    budget: "light",
    difficulty: "easy",
    travelTime: [],
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
  };
}

test("buildWheelSegments only includes categories with at least one place", () => {
  const places = [makePlace("beach"), makePlace("mountain")];
  const segments = buildWheelSegments(places);
  assert.deepEqual(
    segments.map((s) => s.category).sort(),
    ["beach", "mountain"],
  );
});

test("buildWheelSegments wedges are equal-sized and cover the full circle", () => {
  const places = [makePlace("beach"), makePlace("mountain"), makePlace("island")];
  const segments = buildWheelSegments(places);
  const size = 360 / 3;
  for (const segment of segments) {
    assert.ok(Math.abs(segment.endDeg - segment.startDeg - size) < 1e-9);
  }
  assert.equal(segments[0].startDeg, 0);
  assert.equal(segments[segments.length - 1].endDeg, 360);
});

test("spinToCategory always returns one of the wheel's own segments", () => {
  const places = [makePlace("beach"), makePlace("mountain"), makePlace("island")];
  const segments = buildWheelSegments(places);
  for (const roll of [0, 0.1, 0.5, 0.9, 0.999]) {
    const landed = spinToCategory(segments, () => roll);
    assert.ok(segments.includes(landed));
  }
});

test("computeSpinRotation always moves the wheel forward, never backward", () => {
  const places = [makePlace("beach"), makePlace("mountain")];
  const segments = buildWheelSegments(places);
  const rotation = computeSpinRotation(segments[0], 0, () => 0.5);
  assert.ok(rotation > 0);
});

test("computeSpinRotation accumulates from the wheel's current angle rather than resetting", () => {
  const places = [makePlace("beach"), makePlace("mountain")];
  const segments = buildWheelSegments(places);
  const first = computeSpinRotation(segments[0], 0, () => 0.5);
  const second = computeSpinRotation(segments[1], first, () => 0.5);
  assert.ok(second > first);
});
