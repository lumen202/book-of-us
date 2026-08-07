"use client";

import { useMemo, useState } from "react";
import { searchPlaces } from "@/lib/places/source";
import {
  BUDGET_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DIFFICULTY_LABELS,
  TRIP_LENGTH_LABELS,
  TRIP_LENGTH_ORDER,
} from "@/lib/places/taxonomy";
import type { BudgetBand, Difficulty, PlaceCategory, TripLength } from "@/lib/places/types";
import { toSummary } from "@/lib/places/types";
import { PlaceCard } from "./PlaceCard";

const BUDGETS: readonly BudgetBand[] = ["light", "moderate", "splurge"];
const DIFFICULTIES: readonly Difficulty[] = ["easy", "moderate", "hard", "expedition"];

/**
 * Search stays secondary to discovery on purpose — see the "Although
 * discovery is primary, users should still be able to search" brief note.
 * All filtering runs client-side over the ~50-place atlas (no round trip;
 * `searchPlaces` is a pure function over static data), so every change here
 * updates the grid instantly.
 */
export function PlacesBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceCategory | "all">("all");
  const [budget, setBudget] = useState<BudgetBand | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [tripLength, setTripLength] = useState<TripLength | "all">("all");
  const [hiddenGemOnly, setHiddenGemOnly] = useState(false);

  const results = useMemo(() => {
    return searchPlaces({
      query: query || undefined,
      category: category === "all" ? undefined : [category],
      budget: budget === "all" ? undefined : [budget],
      difficulty: difficulty === "all" ? undefined : [difficulty],
      travelTime: tripLength === "all" ? undefined : [tripLength],
      hiddenGemOnly: hiddenGemOnly || undefined,
    }).map(toSummary);
  }, [query, category, budget, difficulty, tripLength, hiddenGemOnly]);

  function reset() {
    setQuery("");
    setCategory("all");
    setBudget("all");
    setDifficulty("all");
    setTripLength("all");
    setHiddenGemOnly(false);
  }

  const hasFilters =
    query !== "" || category !== "all" || budget !== "all" || difficulty !== "all" || tripLength !== "all" || hiddenGemOnly;

  return (
    <div className="flex flex-col gap-8">
      {/*
       * The filter controls sit on real paper, not on the painted scene.
       * `.ink-legible` was tried here first and isn't enough: it paints a
       * halo around glyphs but doesn't change their colour, which works for
       * a big heading with space around it and fails for two dozen small
       * dense labels — see the longer note on the same fix in
       * `app/(app)/places/[slug]/page.tsx`. The results grid below needs no
       * card: each `PlaceCard` already carries its own.
       */}
      <div className="scene-card flex flex-col gap-5 rounded-[1.5rem] border border-border bg-surface px-5 py-6 shadow-[0_20px_40px_-28px_rgba(76,59,48,0.45)] sm:px-7">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, province, or region…"
          aria-label="Search destinations"
          className="w-full border-b border-border bg-transparent py-2 font-serif text-xl text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
        />

        <div role="group" aria-label="Filter by category" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <FilterButton active={category === "all"} onClick={() => setCategory("all")}>
            All
          </FilterButton>
          {CATEGORY_ORDER.map((c) => (
            <FilterButton key={c} active={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_LABELS[c]}
            </FilterButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <LabeledSelect
            label="Budget"
            value={budget}
            onChange={(value) => setBudget(value as BudgetBand | "all")}
            options={[["all", "Any"], ...BUDGETS.map((b): [string, string] => [b, BUDGET_LABELS[b]])]}
          />
          <LabeledSelect
            label="Effort"
            value={difficulty}
            onChange={(value) => setDifficulty(value as Difficulty | "all")}
            options={[["all", "Any"], ...DIFFICULTIES.map((d): [string, string] => [d, DIFFICULTY_LABELS[d]])]}
          />
          <LabeledSelect
            label="Trip length"
            value={tripLength}
            onChange={(value) => setTripLength(value as TripLength | "all")}
            options={[
              ["all", "Any"],
              ...TRIP_LENGTH_ORDER.map((t): [string, string] => [t, TRIP_LENGTH_LABELS[t]]),
            ]}
          />
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            <input
              type="checkbox"
              checked={hiddenGemOnly}
              onChange={(event) => setHiddenGemOnly(event.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            Hidden gems only
          </label>
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="text-[11px] uppercase tracking-[0.2em] text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="ink-legible text-xs uppercase tracking-[0.2em] text-ink-muted">
        {results.length} {results.length === 1 ? "place" : "places"}
      </p>

      {results.length === 0 ? (
        <p className="ink-legible py-16 text-center font-serif text-lg italic text-ink-muted">
          Nothing matches yet — try loosening a filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((place, index) => (
            <PlaceCard key={place.id} place={place} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-[11px] uppercase tracking-[0.2em] transition hover:text-ink ${active ? "text-accent" : "text-ink-muted"}`}
    >
      {children}
    </button>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-b border-border bg-transparent py-1 text-xs normal-case tracking-normal text-ink focus:border-accent focus:outline-none"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
