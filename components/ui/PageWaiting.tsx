import { Waiting } from "./Waiting";
import { WaitingScene } from "./WaitingScene";

/**
 * The shared body of a route's `loading.tsx` — the moment between tapping a
 * link and the page arriving.
 *
 * Next.js renders this instantly, in place of the page, and swaps the real one
 * in when it has streamed. Without it a tap does *nothing* visible until the
 * server answers, and a screen that does nothing does not read as "loading", it
 * reads as "broken".
 *
 * **This is the general case, not the good case.** The best loading state is a
 * bespoke one that mirrors the page it precedes so nothing moves on the swap —
 * `app/(app)/chapters/[slug]/loading.tsx` is that, and its header comment is
 * worth reading before writing another. But a bespoke skeleton has to *know*
 * the page's shape, and a wrong guess is worse than none: the content lands,
 * everything jumps, and the illusion breaks harder than if the screen had just
 * been quiet. So routes whose shape varies (a browse grid whose length depends
 * on filters, a detail page whose hero has no fixed height) get this instead:
 * the page's own title, already in place, and the mark underneath it.
 *
 * The title matters. It is the promise that the tap registered and that you are
 * on your way to the right place — which is most of what a loading screen is
 * actually for. `maxWidth` mirrors the real page's `<main>` so the title lands
 * at the same x-position it will occupy a moment later, and doesn't slide
 * sideways on the swap.
 */
export function PageWaiting({
  title,
  label,
  maxWidth = "max-w-5xl",
}: {
  /** The page's own title, matching the real one exactly. */
  title: string;
  /** Story language — "Gathering the map…", never "Loading…". */
  label: string;
  /** Match the real page's `<main>` container width. */
  maxWidth?: string;
}) {
  return (
    <main
      className={`mx-auto flex w-full ${maxWidth} flex-1 flex-col gap-10 px-6 pt-8`}
      // Announced once, as one thing, rather than as several empty regions.
      aria-busy="true"
    >
      {/* Same type scale every real page title uses, so it doesn't resize on the swap. */}
      <h1 className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">{title}</h1>
      {/* `relative` so `WaitingScene`'s `absolute inset-0` fills this block and not the viewport. */}
      <div className="relative flex flex-1 items-center justify-center pb-24 pt-10">
        <WaitingScene />
        <span className="relative">
          <Waiting label={label} size="lg" />
        </span>
      </div>
    </main>
  );
}
