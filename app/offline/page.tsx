import { WaitingScene } from "@/components/ui/WaitingScene";

/**
 * What the installed app opens to when there is no network — served from the
 * service worker's cache (`public/sw.js`), which is why it must be reachable
 * with no session and must not depend on anything at request time. It is
 * excluded from the proxy matcher for exactly that reason: the whole premise is
 * that we cannot reach Supabase to know who this is.
 *
 * Same in-world voice as `not-found.tsx` and `error.tsx` — a quiet line about
 * the book, not a network diagnostic. Nothing here says "connection", "retry"
 * or "error"; being offline should feel like the book being shut for a moment,
 * not like software failing.
 */
export const metadata = {
  title: "The Book of Us",
};

export default function OfflinePage() {
  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <WaitingScene />
      <span className="relative flex flex-col items-center gap-2">
        <span className="ink-legible font-serif text-lg italic text-ink-muted">
          The book is closed for a moment.
        </span>
        <span className="ink-legible text-sm text-ink-muted/80">
          We&rsquo;ll be here when you&rsquo;re back.
        </span>
      </span>
    </main>
  );
}
