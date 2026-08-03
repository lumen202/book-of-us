"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatFullDate, formatMonthDay, toLocalDate } from "@/lib/format/date";
import type { BucketCategory } from "@/lib/bucket-list/types";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import type { Reaction } from "@/lib/reactions/types";
import { CategoryGlyph } from "@/components/bucket-list/CategoryGlyph";
import { MemoryReactions } from "./MemoryReactions";

/**
 * Prints are never laid down perfectly straight in a real album. The tilt is
 * deterministic by position (not random) so a chapter looks the same every
 * visit — it should read as "someone placed these", not as jitter.
 */
const TILTS = [-1.5, 1, -0.7, 1.4, -1.1, 0.6];

/**
 * How long a press has to last before it counts as "hold this and tell me how
 * you feel about it" rather than "open this".
 *
 * 450ms is the usual platform figure and it is the right one for a reason worth
 * writing down: shorter and ordinary taps start opening the reaction picker by
 * accident, longer and it stops feeling like the thing is responding to you.
 */
const HOLD_MS = 450;

/**
 * How far a finger may travel before the press stops being a press.
 *
 * Without this every scroll that starts on a photo — which on a page that is
 * mostly photos is most scrolls — would open a reaction picker on the way past.
 */
const HOLD_SLOP_PX = 10;

/** A photo corner mount — four of these hold each print to the page. */
function Corner({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-5 w-5 bg-ink/15 ${className}`}
    />
  );
}

/**
 * One print, mounted on the album page.
 *
 * Only ever renders an image — the album is photos for now, and
 * `albumPrints()` guarantees nothing else reaches this component. The
 * thumbnail is preferred; `mediaUrl` is the fallback for rows written before
 * thumbnails existed.
 *
 * Structure note: the outer element is a `div`, not a `button`. The remove
 * control has to be a sibling of the "lift this print" button rather than a
 * child of it — nested buttons are invalid HTML and the inner one stops being
 * reachable by keyboard.
 */
export function MemoryCard({
  memory,
  index,
  reactions,
  commentCount,
  currentUserId,
  album,
  onSelect,
  onRemove,
  removeLabel,
  onReact,
  onUnreact,
}: {
  memory: MemoryWithMedia;
  index: number;
  reactions: Reaction[];
  commentCount: number;
  currentUserId: string | null;
  /**
   * Set when this print is a kept promise's cover, showing on its chapter
   * page — never set inside the album itself. Turns the plain print into a
   * small stack with a tag pinned across the top, so a promise's photo reads
   * as "there's more behind this one" at a glance rather than looking like
   * any other single print on the page.
   */
  album?: { category: BucketCategory; title: string } | null;
  onSelect: () => void;
  /** Asks to remove this print — the caller confirms in a dialog first. */
  onRemove: () => void;
  /** e.g. "this chapter" or "this album" — where the remove button says the print is leaving. */
  removeLabel: string;
  onReact: (emoji: string) => Promise<void>;
  onUnreact: () => Promise<void>;
}) {
  const tilt = TILTS[index % TILTS.length];
  const imageUrl = memory.thumbnailUrl ?? memory.mediaUrl;

  /**
   * Press and hold a print to react to it, the way you would anywhere else.
   *
   * Implemented on pointer events rather than by reaching for a library: the
   * whole gesture is a timer, a distance check and one flag, and the flag is
   * the part that actually matters. A long press on a `<button>` still fires
   * `click` when the finger comes up, so without `heldRef` every reaction would
   * be followed by the print lifting open behind the picker.
   */
  const [pickerOpen, setPickerOpen] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdOrigin = useRef<{ x: number; y: number } | null>(null);
  const heldRef = useRef(false);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdOrigin.current = null;
  }, []);

  // A card can be unmounted mid-press — removing a print does exactly that —
  // and a timer that fires into a gone component would set state on nothing.
  useEffect(() => cancelHold, [cancelHold]);

  const startHold = useCallback(
    (event: React.PointerEvent) => {
      // Primary presses only: a right-click or a stylus barrel button is not
      // somebody holding a photograph.
      if (event.button !== 0) return;
      heldRef.current = false;
      holdOrigin.current = { x: event.clientX, y: event.clientY };
      holdTimer.current = setTimeout(() => {
        heldRef.current = true;
        setPickerOpen(true);
      }, HOLD_MS);
    },
    [],
  );

  const moveHold = useCallback(
    (event: React.PointerEvent) => {
      const origin = holdOrigin.current;
      if (!origin) return;
      const travelled =
        Math.abs(event.clientX - origin.x) + Math.abs(event.clientY - origin.y);
      if (travelled > HOLD_SLOP_PX) cancelHold();
    },
    [cancelHold],
  );

  if (!imageUrl) return null;

  return (
    <div
      style={{ rotate: `${tilt}deg` }}
      className="group relative transition duration-500 ease-(--ease-bounce) hover:-translate-y-2 hover:scale-[1.02] hover:[rotate:0deg] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
    >
      {/* Two more sheets of album paper peeking out from behind the top
          print — the visual shorthand for "there's more inside" that a
          single tag alone wouldn't read at a glance. Purely decorative:
          the tag is what actually says "album" to a screen reader. */}
      {album && (
        <>
          <div
            aria-hidden
            style={{ rotate: "4deg", translate: "7px 5px" }}
            className="absolute inset-2 -z-10 rounded-2xl bg-[#fffdf7] shadow-[0_10px_20px_-16px_rgba(76,59,48,0.4)]"
          />
          <div
            aria-hidden
            style={{ rotate: "-3deg", translate: "-5px 6px" }}
            className="absolute inset-2 -z-10 rounded-2xl bg-[#fffdf7]/95 shadow-[0_8px_16px_-14px_rgba(76,59,48,0.32)]"
          />
        </>
      )}

      <button
        type="button"
        onClick={() => {
          // The press that just opened the picker also ends in a click. This
          // is the line that stops it lifting the print open behind it.
          if (heldRef.current) {
            heldRef.current = false;
            return;
          }
          onSelect();
        }}
        onPointerDown={startHold}
        onPointerMove={moveHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        // Android and iOS both answer a long press on an image with their own
        // "save image" sheet, which would land on top of the picker. These turn
        // that off for the print only — `select-none` because the same press
        // otherwise starts selecting the caption text underneath it.
        onContextMenu={(event) => event.preventDefault()}
        className="block w-full select-none text-left [-webkit-touch-callout:none] focus-visible:outline-none"
      >
        <div className="relative rounded-2xl bg-[#fffdf7] p-3 pb-4 shadow-[0_12px_24px_-14px_rgba(76,59,48,0.42)] transition duration-700 group-hover:shadow-[0_24px_38px_-18px_rgba(76,59,48,0.45)] group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-accent motion-reduce:transition-none">
          {/* A tag pinned across the top of the print, counter-rotated
              against the card's own tilt so it always reads level — as if
              someone clipped it on straight regardless of how the photo
              underneath sits on the page. */}
          {album && (
            <div
              aria-hidden
              style={{ rotate: `${-tilt}deg` }}
              className="pointer-events-none absolute -top-3 left-4 z-10 flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-surface shadow-[0_8px_16px_-8px_rgba(76,59,48,0.55)]"
            >
              <CategoryGlyph category={album.category} className="h-3 w-3" />
              Album
            </div>
          )}

          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink/5">
            <Image
              src={imageUrl}
              alt=""
              fill
              // Off, or the browser's native image drag fires on the same
              // press-and-hold that is supposed to open the reaction picker,
              // and the print peels away from the page as a drag ghost.
              draggable={false}
              unoptimized
              loading="lazy"
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
              className="object-cover transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <Corner className="left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]" />
            <Corner className="right-0 top-0 [clip-path:polygon(100%_0,100%_100%,0_0)]" />
            <Corner className="bottom-0 left-0 [clip-path:polygon(0_100%,0_0,100%_100%)]" />
            <Corner className="bottom-0 right-0 [clip-path:polygon(100%_100%,0_100%,100%_0)]" />
          </div>

          {/* The caption someone wrote under the print. Captions are optional,
              and an uncaptioned photo is stored with its date as the title — so
              skip the caption line in that case rather than printing the date
              twice, one line above the other. */}
          <figcaption className="mt-3 px-1">
            {album && (
              <span className="sr-only">
                Part of the album for the promise &ldquo;{album.title}&rdquo;
              </span>
            )}
            {memory.title !== formatMonthDay(toLocalDate(memory.occurred_at)) && (
              <span className="block font-serif text-xl italic leading-tight text-ink">
                {memory.title}
              </span>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] tracking-[0.18em] text-ink-muted">
              <time dateTime={memory.occurred_at} className="uppercase">
                {formatFullDate(memory.occurred_at)}
              </time>
              {commentCount > 0 && (
                <span>· {commentCount === 1 ? "1 note" : `${commentCount} notes`}</span>
              )}
              {/* Who put it here. Lower case against the upper-case date so the
                  line reads as one caption with an aside in it, rather than as
                  two competing labels — and see the note in `MemoryDetail` for
                  why this is "your partner" and not a name. */}
              {memory.created_by && (
                <span className="normal-case tracking-normal">
                  · kept by {memory.created_by === currentUserId ? "you" : "your partner"}
                </span>
              )}
            </div>
          </figcaption>
        </div>
      </button>

      {/* Always visible, not hover-only: on a touch screen there is no hover,
          and a control you can't find isn't a control. It only *asks* — the
          confirmation is a dialog in the middle of the screen, owned by
          MemoryGrid. */}
      <button
        type="button"
        aria-label={`Remove ${memory.title} from ${removeLabel}`}
        onClick={onRemove}
        // The visible circle stays 32px so it doesn't dominate the print's
        // corner — `before` pads out the actual tappable area to ~44px (the
        // touch-target comfort minimum) without adding any paint. The button
        // is already `absolute`, which is all a descendant pseudo-element
        // needs to position against.
        className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-base leading-none text-ink-muted shadow-[0_4px_10px_-4px_rgba(76,59,48,0.5)] transition before:absolute before:-inset-1.5 before:content-[''] hover:scale-110 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        ×
      </button>

      {/* Controlled, so the corner sticker and the press-and-hold above open
          the same picker rather than two of them. */}
      <MemoryReactions
        memoryId={memory.id}
        reactions={reactions}
        currentUserId={currentUserId}
        variant="corner"
        onReact={onReact}
        onUnreact={onUnreact}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />
    </div>
  );
}
