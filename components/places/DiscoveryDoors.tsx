"use client";

import { useState, type ReactNode } from "react";
import type { Month } from "@/lib/places/types";
import { DiscoveryLayer } from "./DiscoveryLayer";
import { LuckyDraw } from "./LuckyDraw";
import { SpinWheel } from "./SpinWheel";
import { SurpriseMe } from "./SurpriseMe";
import { WeekendEscape } from "./WeekendEscape";

/**
 * The four ways in, and the room each one opens.
 *
 * Replaces the old `/places`, which stacked every mode down one long page and
 * left "spin the wheel" as a scroll target three games below the fold. See
 * `DiscoveryLayer` for why a layer rather than a route per mode.
 *
 * ## Doors are a list, not a dashboard
 *
 * Four options at once is close to the edge of the "reduce simultaneous
 * choices" guardrail, so the presentation does the work of staying on the right
 * side of it: a stacked list of tactile strips with a serif name and one line
 * of invitation each — the same register as `ChapterCover`'s chapter strips —
 * rather than a grid of equal icon tiles, which is the shape of an app's home
 * screen. Reading them takes a beat each, in order, instead of presenting a
 * control panel to be scanned.
 *
 * ## Nothing mounts until it is opened
 *
 * Each mode lives inside its own `DiscoveryLayer`, which renders nothing at all
 * while closed (`AnimatePresence` with a falsy child). So the wheel's
 * twenty-wedge SVG, four card faces and the weekend picker are built when
 * someone asks for them, not on arrival — which is most of what made the
 * landing page heavy, and is why the wheel's geometry no longer runs on a
 * visit that never touches it.
 */

type DoorId = "draw" | "wheel" | "weekend" | "gems";

/**
 * `control` is what the door says on the landing page; `eyebrow` + `title` are
 * what the room says once it opens.
 *
 * The invitation lines each door used to carry ("Turn one over and see where it
 * wants you to go") are gone from the landing page, not deleted — `title` is
 * the same voice and the layer prints it the moment the door opens, which is
 * when it is actually useful. On the landing page four of them stacked up as
 * four paragraphs to read before choosing anything, which is more deliberation
 * than "pick how you'd like to be surprised" deserves.
 */
const DOORS: readonly { id: DoorId; control: string; eyebrow: string; title: string }[] = [
  { id: "draw", control: "Lucky draw", eyebrow: "Lucky draw", title: "Four cards, face down." },
  { id: "wheel", control: "Spin the wheel", eyebrow: "Spin the wheel", title: "Let the category choose itself." },
  { id: "weekend", control: "Weekend escape", eyebrow: "Weekend escape", title: "How long do you actually have?" },
  { id: "gems", control: "Hidden gems", eyebrow: "Hidden gem mode", title: "Nobody else has heard of these." },
];

export function DiscoveryDoors({
  recentlyShown,
  month,
  wishlist,
  visited,
  hiddenGemsRail,
}: {
  recentlyShown: readonly string[];
  month: Month;
  wishlist: readonly string[];
  visited: readonly string[];
  /**
   * The hidden-gem rail, **already rendered on the server** and passed down as
   * a node rather than as `PlaceSummary[]` for this component to render.
   *
   * `PlaceRail`/`PlaceCard` are server components, and taking the data instead
   * would have pulled both into the client bundle *and* serialised every
   * summary across the RSC boundary — measured at 85 KB for the full gem list,
   * mostly the inlined `blurDataUrl` on each hero, sent on every visit to
   * `/places` whether or not anyone opened this door. As a node the cards stay
   * server-rendered and this component never sees the data at all.
   */
  hiddenGemsRail: ReactNode;
}) {
  const [openDoor, setOpenDoor] = useState<DoorId | null>(null);
  const close = () => setOpenDoor(null);

  const modeProps = { recentlyShown, month, wishlist, visited };
  const door = (id: DoorId) => DOORS.find((d) => d.id === id)!;

  return (
    <>
      {/*
       * Pills, not cards. Four full-width cards with a heading and a paragraph
       * each ran most of a screen on their own and read as four things to
       * study; these read as four ways to start, which is what they are.
       *
       * Centred and wrapping rather than a fixed grid: two per row on a phone,
       * four across on a desktop, so the set stays a *row of choices* instead
       * of resolving into the tile grid `experience-direction.md` warns off.
       *
       * The styling is glass-on-photograph, because these live inside
       * `PlacesHero` over its dimmed backdrop — `text-surface` on a translucent
       * wash, the same treatment the hero's own secondary link already used.
       * They are not general-purpose buttons; if a door ever needs to sit on
       * paper, that is a variant to add, not a default to change.
       */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {DOORS.map(({ id, control }) => (
          <button
            key={id}
            type="button"
            onClick={() => setOpenDoor(id)}
            className="rounded-full border border-surface/40 bg-surface/10 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-surface backdrop-blur-sm transition duration-300 ease-(--ease-bounce) hover:-translate-y-0.5 hover:border-surface/70 hover:bg-surface/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface motion-reduce:hover:translate-y-0"
          >
            {control}
          </button>
        ))}
      </div>

      <DiscoveryLayer
        open={openDoor === "draw"}
        eyebrow={door("draw").eyebrow}
        title={door("draw").title}
        onClose={close}
      >
        <LuckyDraw {...modeProps} />
      </DiscoveryLayer>

      <DiscoveryLayer
        open={openDoor === "wheel"}
        eyebrow={door("wheel").eyebrow}
        title={door("wheel").title}
        onClose={close}
      >
        <SpinWheel {...modeProps} />
      </DiscoveryLayer>

      <DiscoveryLayer
        open={openDoor === "weekend"}
        eyebrow={door("weekend").eyebrow}
        title={door("weekend").title}
        onClose={close}
      >
        <WeekendEscape {...modeProps} />
      </DiscoveryLayer>

      <DiscoveryLayer
        open={openDoor === "gems"}
        eyebrow={door("gems").eyebrow}
        title={door("gems").title}
        onClose={close}
      >
        {/*
         * The rail is edge-to-edge inside the panel's padding (`-mx-*` to
         * cancel it), so the row of cards runs to both edges the way it did
         * full-width on the page — a scrollable rail that stops short of the
         * edge doesn't read as scrollable.
         */}
        <div className="-mx-5 w-[calc(100%+2.5rem)] sm:-mx-10 sm:w-[calc(100%+5rem)]">{hiddenGemsRail}</div>
        <SurpriseMe
          {...modeProps}
          hiddenGemOnly
          source="hidden-gem"
          label="Surprise me with a hidden gem"
          loadingLabel="Looking somewhere quieter…"
          className="rounded-full border border-border bg-surface px-7 py-2.5 text-[11px] uppercase tracking-[0.24em] text-ink shadow-[0_8px_16px_-8px_rgba(76,59,48,0.4)] transition hover:border-accent hover:text-accent"
        />
      </DiscoveryLayer>
    </>
  );
}
