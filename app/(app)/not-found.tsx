import Link from "next/link";
import { WaitingScene } from "@/components/ui/WaitingScene";

/**
 * Reached for any URL under `(app)` that doesn't resolve to a page — a stale
 * link, a mistyped slug. Same in-world voice as `error.tsx`: a quiet line,
 * not a 404 stack.
 */
export default function AppNotFound() {
  return (
    <main
      className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center"
      aria-busy="false"
    >
      <WaitingScene />
      <span className="relative flex flex-col items-center gap-2">
        <span className="ink-legible font-serif text-lg italic text-ink-muted">
          This page hasn&rsquo;t been written yet.
        </span>
        <Link
          href="/"
          className="ink-legible rounded-full border border-accent/40 bg-surface/80 px-5 py-2 text-sm text-ink transition hover:border-accent"
        >
          Back to the book
        </Link>
      </span>
    </main>
  );
}
