import assert from "node:assert/strict";
import { test } from "node:test";
import { filterEligibleChapters } from "./chapterEligibility";

const chapters = [
  { id: "aug", month: "2026-08-01" },
  { id: "jul", month: "2026-07-01" },
  { id: "jun", month: "2026-06-01" },
];

test("automatic path (excludeCurrentMonth default true) excludes the current month", () => {
  const now = new Date(2026, 7, 5); // August 5, 2026
  const eligible = filterEligibleChapters(chapters, now, true);
  assert.deepEqual(
    eligible.map((c) => c.id),
    ["jul", "jun"],
  );
});

test("excludeCurrentMonth: false includes the current month", () => {
  const now = new Date(2026, 7, 5); // August 5, 2026
  const eligible = filterEligibleChapters(chapters, now, false);
  assert.deepEqual(
    eligible.map((c) => c.id),
    ["aug", "jul", "jun"],
  );
});

test("excludes only the chapter matching the current calendar month, not others", () => {
  const now = new Date(2026, 6, 15); // July 15, 2026
  const eligible = filterEligibleChapters(chapters, now, true);
  assert.deepEqual(
    eligible.map((c) => c.id),
    ["aug", "jun"],
  );
});
