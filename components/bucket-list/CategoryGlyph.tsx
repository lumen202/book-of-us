import type { BucketCategory } from "@/lib/bucket-list/types";

/**
 * One small ink mark per category, drawn in the margin instead of a coloured
 * pill — see `docs/plans/bucket-list.md` §0.1 for why. Inline SVG paths in
 * `currentColor`, the same convention as `components/ambient/paint/`:
 * theme-aware for free (Celebration Mode included), zero network requests,
 * and no icon-library dependency for eight marks that never need more states
 * than "drawn" and "not drawn".
 */
const PATHS: Record<BucketCategory, React.ReactNode> = {
  // A small paper plane, mid-flight.
  travel: (
    <path d="M17.5 3 3 9.8l6 2.2M17.5 3 11 17l-2-5M17.5 3 9 11.2" />
  ),
  // A simple fork — three tines and a handle.
  food: (
    <path d="M6.5 3v5.2a1.8 1.8 0 0 0 3.6 0V3M8.3 8.6V17M13.5 3c-.9 0-1.5 1.4-1.5 3.4s.6 3.4 1.5 3.4M13.5 3c.9 0 1.5 1.4 1.5 3.4S14.4 9.8 13.5 9.8M13.5 9.8V17" />
  ),
  // A crescent moon, for a night out.
  date: <path d="M13.8 3.2a7 7 0 1 0 5 10.6A7 7 0 0 1 13.8 3.2Z" />,
  // A mountain peak with a small flag of ambition.
  adventure: (
    <path d="M2.5 16 8 6l3 4.5L14 8l5.5 8H2.5ZM8 6v-.5" />
  ),
  // A little house, roof and door.
  home: <path d="M3.5 10.2 10 4l6.5 6.2V17h-13v-6.8ZM8 17v-4.5h4V17" />,
  // A star for the far-off, no-date-attached wishes.
  someday: (
    <path d="M10 2.8l1.9 4.6 5 .4-3.8 3.3 1.2 4.9L10 13.4l-4.3 2.6 1.2-4.9-3.8-3.3 5-.4Z" />
  ),
  // A plain small mark — deliberately the least specific glyph.
  other: <path d="M10 5.5v9M5.5 10h9" />,
};

const LABELS: Record<BucketCategory, string> = {
  travel: "Travel",
  food: "Food",
  date: "Date night",
  adventure: "Adventure",
  home: "Home",
  someday: "Someday",
  other: "Other",
};

export function CategoryGlyph({
  category,
  className,
}: {
  category: BucketCategory;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label={LABELS[category]}
    >
      {PATHS[category]}
    </svg>
  );
}
