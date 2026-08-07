/**
 * The one waiting indicator in the book.
 *
 * **It is not a spinner, and it must not become one.** A rotating ring is the
 * most recognisable piece of stock software there is; it says "an application
 * is busy", which is the register `experience-direction.md` exists to keep out
 * of this project — the same reasoning already written down at the top of
 * `app/(app)/chapters/[slug]/loading.tsx`. This is three ink drops soaking into
 * paper, one after another: "something is being written down". The keyframe is
 * `settling` in `app/globals.css`, where the pacing is argued.
 *
 * Deliberately **not** a client component. It holds no state and no hooks — the
 * whole animation is CSS — so it drops into server components (a `loading.tsx`,
 * a suspense fallback) and client ones alike without dragging a bundle along.
 *
 * ## Choosing a form
 *
 * | Use | How |
 * |---|---|
 * | Inside a button that is submitting | `<Waiting size="sm" />` beside (or instead of) the label — the button already names the action, so leave `label` off |
 * | A panel waiting for its content | `<Waiting label="Finding somewhere…" />` |
 * | A whole screen | `<Waiting label="…" size="lg" />` centred in the space the content will take |
 *
 * `label` is written in story language, like every other string in the book —
 * "Finding somewhere…", "Tucking it in…", "One moment…". Never "Loading…".
 *
 * ## Accessibility
 *
 * With a `label`, the whole thing is a `role="status"` live region, so a screen
 * reader announces the wait once, politely, without stealing focus. Without a
 * `label` it is `aria-hidden` decoration and the caller is responsible for
 * saying what is happening — usually the button's own text, or an `aria-busy`
 * on the region being replaced.
 */

/** Drop diameter and label size per scale. Kept here so callers pass intent, not pixels. */
const SIZES = {
  sm: { dot: "h-1.5 w-1.5", gap: "gap-1", text: "text-xs", stack: "gap-2" },
  md: { dot: "h-2 w-2", gap: "gap-1.5", text: "text-sm", stack: "gap-3" },
  lg: { dot: "h-2.5 w-2.5", gap: "gap-2", text: "font-serif text-lg italic", stack: "gap-4" },
} as const;

export type WaitingSize = keyof typeof SIZES;

/**
 * The mark on its own — three drops. Split out from `Waiting` so a caller that
 * has its own layout (a button's inner flex row, say) can place just the drops
 * without inheriting the stacked column below.
 */
export function WaitingMark({
  size = "md",
  className = "",
}: {
  size?: WaitingSize;
  className?: string;
}) {
  const scale = SIZES[size];
  return (
    <span aria-hidden className={`inline-flex items-center ${scale.gap} ${className}`}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`ambient-settling inline-block rounded-full bg-accent ${scale.dot}`}
          // Staggered rather than synchronised: three dots pulsing in unison
          // reads as one blinking object, where a sequence reads as something
          // being drawn. A third of the 1.4s period apart, so the wave runs
          // continuously with no dead beat between cycles.
          style={{ animationDelay: `${index * 0.16}s` }}
        />
      ))}
    </span>
  );
}

export function Waiting({
  label,
  size = "md",
  className = "",
}: {
  /** Story language, e.g. "Finding somewhere…". Omit inside a button that already names the action. */
  label?: string;
  size?: WaitingSize;
  className?: string;
}) {
  const scale = SIZES[size];

  if (!label) return <WaitingMark size={size} className={className} />;

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex flex-col items-center ${scale.stack} ${className}`}
    >
      <WaitingMark size={size} />
      <span className={`${scale.text} text-ink-muted`}>{label}</span>
    </span>
  );
}
