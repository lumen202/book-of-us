import { Waiting } from "@/components/ui/Waiting";
import { WaitingScene } from "@/components/ui/WaitingScene";

/** Same reasoning as `places/[slug]/loading.tsx`: the promise's own words are the page. */
export default function PromiseLoading() {
  return (
    <main
      className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 pt-8"
      aria-busy="true"
    >
      <WaitingScene />
      <span className="relative">
        <Waiting label="Opening it…" size="lg" onScene />
      </span>
    </main>
  );
}
