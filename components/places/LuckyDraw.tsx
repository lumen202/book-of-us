"use client";

import { useEffect, useState } from "react";
import { recordPlaceShown } from "@/app/(app)/places/actions";
import { pickManyPlaces } from "@/lib/places/engine";
import { getAllPlaces } from "@/lib/places/source";
import type { Month, Place } from "@/lib/places/types";
import { PlaceRevealOverlay } from "./PlaceRevealOverlay";

const CARD_COUNT = 4;

/**
 * Mystery cards, face down, drawn once **after mount** — and the timing there
 * is a correctness requirement, not a preference.
 *
 * `pickManyPlaces` is `Math.random()`-backed, and a `useState` initializer runs
 * twice for a client component inside an RSC page: once on the server to
 * produce the HTML, once on the client to hydrate it. Two random draws, two
 * different sets of four names in the same `<span>`, and React threw
 * "server rendered text didn't match the client" on every single load of
 * `/places`. Drawing in an effect means the server renders four card *backs*
 * with no place data in them at all, which is also the honest markup: which
 * four you drew is not something the server should have an opinion about.
 *
 * Once drawn, the set stays put across re-renders — flipping one card must not
 * reshuffle the others. A fresh set only appears on "New cards" or a reload,
 * which is the same "don't repeat the spread you just saw" idea
 * `pickManyPlaces` already gives one draw.
 */
export function LuckyDraw({
  recentlyShown,
  month,
  wishlist,
  visited,
}: {
  recentlyShown: readonly string[];
  month: Month;
  wishlist: readonly string[];
  visited: readonly string[];
}) {
  const [cards, setCards] = useState<Place[] | null>(null);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [openPlace, setOpenPlace] = useState<Place | null>(null);

  // Empty dependency list on purpose: this draws the opening spread once, and
  // must not redraw when `recentlyShown` changes underneath it after a card is
  // flipped (flipping writes to the shown-log, which is where that prop comes
  // from — a reactive dependency here would reshuffle the hand mid-turn).
  useEffect(() => {
    setCards(pickManyPlaces(getAllPlaces(), CARD_COUNT, { excludeSlugs: new Set(recentlyShown), month }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flip(card: Place) {
    if (flipped.has(card.slug)) {
      setOpenPlace(card);
      return;
    }
    setFlipped((prev) => new Set(prev).add(card.slug));
    void recordPlaceShown(card.slug, "lucky-draw");
  }

  function reshuffle() {
    setCards(pickManyPlaces(getAllPlaces(), CARD_COUNT, { excludeSlugs: new Set(recentlyShown), month }));
    setFlipped(new Set());
  }

  return (
    // `w-full` on this root is load-bearing, not decoration. This component
    // is rendered inside an `items-center` flex column, which makes a child's
    // width shrink-to-fit its *content* — so the grid's own `w-full` below
    // was resolving against a content-derived width rather than the page
    // column, and the whole 2×2 spread collapsed to the size of its smallest
    // possible layout. That, not the column count, is why these cards kept
    // coming out tiny however much the grid's `max-w-*` changed.
    <div className="flex w-full flex-col items-center gap-6">
      {/*
       * Two columns at every size — never four. `sm:grid-cols-4` had each
       * card sharing ~670px four ways at tablet width (~150px each, smaller
       * than on a phone). Four face-down cards are a *hand* to pick from,
       * not a row of thumbnails, so a 2×2 spread at playing-card
       * proportions keeps each one big enough to read as an object you turn
       * over, and the set still fits one screen.
       */}
      <div className="grid w-full max-w-md grid-cols-2 gap-5 sm:max-w-xl sm:gap-6">
        {/*
         * Before the draw (server render, and the first client frame) the hand
         * is four plain backs. Same box, same aspect ratio, same face-down
         * face — so the real cards arriving is not a layout shift, it's just
         * the moment the hand becomes yours.
         */}
        {cards === null &&
          Array.from({ length: CARD_COUNT }, (_, i) => (
            <div key={`back-${i}`} className="[perspective:1000px]">
              <div className="relative aspect-[5/7] w-full">
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-border bg-[color-mix(in_srgb,var(--color-accent)_16%,var(--color-surface))] shadow-[0_14px_28px_-18px_rgba(76,59,48,0.5)]">
                  <span className="font-serif text-5xl text-accent">?</span>
                </div>
              </div>
            </div>
          ))}
        {cards?.map((card) => {
          const isFlipped = flipped.has(card.slug);
          return (
            <button
              key={card.slug}
              type="button"
              onClick={() => flip(card)}
              aria-label={isFlipped ? `Open ${card.name}` : "Reveal this card"}
              className="group [perspective:1000px]"
            >
              <div
                className="relative aspect-[5/7] w-full transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
                style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-border bg-[color-mix(in_srgb,var(--color-accent)_16%,var(--color-surface))] shadow-[0_14px_28px_-18px_rgba(76,59,48,0.5)] [backface-visibility:hidden]">
                  <span className="font-serif text-5xl text-accent">?</span>
                </div>
                <div
                  className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_14px_28px_-18px_rgba(76,59,48,0.5)] [backface-visibility:hidden]"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  {isFlipped && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.heroImage.url}
                      alt=""
                      className="h-3/4 w-full object-cover"
                    />
                  )}
                  <div className="flex h-1/4 flex-col items-center justify-center gap-1 px-3 text-center">
                    <span className="font-serif text-base leading-tight text-ink">{card.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted">{card.province}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/*
       * A real button on its own paper, not muted underlined text. As bare
       * `text-ink-muted` on the painted backdrop this all but disappeared
       * against the night meadow — and it's the one control that resets the
       * whole spread, so it has to be findable. Same pill shape the wheel's
       * own "Spin the wheel" uses, for consistency between the two modes.
       */}
      <button
        type="button"
        onClick={reshuffle}
        className="rounded-full border border-border bg-surface px-7 py-2.5 text-[11px] uppercase tracking-[0.24em] text-ink shadow-[0_8px_16px_-8px_rgba(76,59,48,0.4)] transition hover:border-accent hover:text-accent"
      >
        New cards
      </button>

      <PlaceRevealOverlay
        place={openPlace}
        loading={false}
        loadingLabel=""
        wishlisted={openPlace ? wishlist.includes(openPlace.slug) : false}
        visited={openPlace ? visited.includes(openPlace.slug) : false}
        onClose={() => setOpenPlace(null)}
      />
    </div>
  );
}
