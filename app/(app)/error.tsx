"use client";

import { useEffect } from "react";
import { Waiting } from "@/components/ui/Waiting";
import { WaitingScene } from "@/components/ui/WaitingScene";

/**
 * The book's answer to a thrown server-component error, for everything under
 * `(app)`. Without this, a Supabase hiccup or a bad signed URL drops the
 * reader onto Next.js's stock error page — a stack trace in dev, a bare
 * "Application error" in prod. `experience-direction.md` calls that the most
 * jarring thing this app can do, so it borrows the `Waiting` vocabulary
 * instead of a dialog: a quiet in-world line, not an alert.
 *
 * Must be a Client Component — Next.js requires it for `error.tsx`.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center"
      aria-busy="false"
    >
      <WaitingScene />
      <span className="relative flex flex-col items-center gap-6">
        <Waiting label="This page is resting for a moment." size="lg" onScene />
        <button
          type="button"
          onClick={reset}
          className="ink-legible rounded-full border border-accent/40 bg-surface/80 px-5 py-2 text-sm text-ink transition hover:border-accent"
        >
          Try again
        </button>
      </span>
    </main>
  );
}
