"use client";

import { CATEGORIES, type BucketCategory } from "@/lib/bucket-list/types";
import { CategoryGlyph } from "./CategoryGlyph";

/**
 * Filtering by category — a real ask, but built to keep the same restraint
 * `bucket-list.md` already established: no colored pill/badge chips (that
 * reads as a dashboard filter bar, the exact thing `BUG-004` moved the nav
 * away from). Just the same small glyph-in-the-margin language
 * `CategoryGlyph` already uses everywhere else on this page, made tappable,
 * with the current one picked out by color the same way `NavLink` marks the
 * current section in the header.
 *
 * Only categories actually present in the list are offered — a promise here
 * that never used "Someday" doesn't need an empty "Someday" button.
 */
export function CategoryFilterRow({
  present,
  value,
  onChange,
}: {
  present: BucketCategory[];
  value: BucketCategory | "all";
  onChange: (category: BucketCategory | "all") => void;
}) {
  const options = CATEGORIES.filter((entry) => present.includes(entry.value));
  if (options.length < 2) return null;

  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-5"
    >
      <button
        type="button"
        onClick={() => onChange("all")}
        aria-pressed={value === "all"}
        className={`text-[11px] uppercase tracking-[0.2em] transition hover:text-ink ${
          value === "all" ? "text-accent" : "text-ink-muted"
        }`}
      >
        All
      </button>
      {options.map((entry) => (
        <button
          key={entry.value}
          type="button"
          onClick={() => onChange(entry.value)}
          aria-pressed={value === entry.value}
          title={entry.label}
          className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] transition hover:text-ink ${
            value === entry.value ? "text-accent" : "text-ink-muted"
          }`}
        >
          <CategoryGlyph category={entry.value} className="h-3.5 w-3.5 shrink-0" />
          {entry.label}
        </button>
      ))}
    </div>
  );
}
