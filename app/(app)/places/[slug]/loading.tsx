import { Waiting } from "@/components/ui/Waiting";
import { WaitingScene } from "@/components/ui/WaitingScene";

/**
 * No title here, unlike the other `loading.tsx` files — the whole point of a
 * destination page is the name of the place, and this route doesn't know it
 * yet (it's `params`, resolved on the server). Printing a guess, or the word
 * "Places", would be the one thing worse than printing nothing: it tells the
 * reader they arrived somewhere generic when they tapped a specific place.
 * So this beat stays quiet and just says a place is on its way.
 */
export default function PlaceLoading() {
  return (
    <main
      className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 pt-8"
      aria-busy="true"
    >
      <WaitingScene />
      <span className="relative">
        <Waiting label="Getting there…" size="lg" onScene />
      </span>
    </main>
  );
}
