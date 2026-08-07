import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMonthRange } from "./taxonomy";
import type { Month } from "./types";

test("formatMonthRange: all twelve months reads as 'All year'", () => {
  const all = Array.from({ length: 12 }, (_, i) => (i + 1) as Month);
  assert.equal(formatMonthRange(all), "All year");
});

test("formatMonthRange: empty reads as 'Any time'", () => {
  assert.equal(formatMonthRange([]), "Any time");
});

test("formatMonthRange: a single contiguous run", () => {
  assert.equal(formatMonthRange([3, 4, 5]), "Mar–May");
});

test("formatMonthRange: a single month has no dash", () => {
  assert.equal(formatMonthRange([7]), "Jul");
});

test("formatMonthRange: wraps across the year boundary as one run", () => {
  assert.equal(formatMonthRange([11, 12, 1, 2]), "Nov–Feb");
});

test("formatMonthRange: two disjoint windows render as separate runs", () => {
  assert.equal(formatMonthRange([1, 2, 7, 8]), "Jan–Feb, Jul–Aug");
});
