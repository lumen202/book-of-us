import { Waiting } from "@/components/ui/Waiting";
import { WaitingScene } from "@/components/ui/WaitingScene";

/**
 * The wait before the bookshelf — and the fallback for any route in this group
 * that hasn't got a `loading.tsx` of its own (the keeper pages).
 *
 * Home is one of the slowest routes in the book: it awaits chapters, the
 * relationship, the keeper check and — on the 5th — a signed Storage URL per
 * look-back print, before a single pixel renders. Until this file existed the
 * only feedback was `NavigationProgress`, which by design lifts the moment the
 * navigation *commits*, leaving the rest of the wait silent.
 *
 * ## Why this one has no title, unlike the others
 *
 * `PageWaiting` prints the destination's own `<h1>` so it is already in place
 * when the content lands. That is right everywhere except here. Home is wrapped
 * in `HomeCover`, which plays the opening sequence — the arrival beat the whole
 * experience direction is built around. Printing "Chapters" and the shelf's
 * heading first, only for the ceremony to cover them a moment later, is a
 * reveal followed by a cover: it spends the arrival before the arrival happens.
 *
 * So this beat stays wordless apart from the line. The scene is the same warm
 * light every other wait uses, so it reads as continuous with them, and it
 * hands over to either the ceremony or the shelf without having promised
 * either one.
 */
export default function AppLoading() {
  return (
    <main
      className="relative mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-24"
      aria-busy="true"
    >
      <WaitingScene />
      <span className="relative">
        <Waiting label="Opening the book…" size="lg" onScene />
      </span>
    </main>
  );
}
