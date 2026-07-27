"use client";

import Image from "next/image";
import { formatFullDate, formatMonthDay, toLocalDate } from "@/lib/format/date";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import type { Reaction } from "@/lib/reactions/types";
import { MemoryReactions } from "./MemoryReactions";

/**
 * Prints are never laid down perfectly straight in a real album. The tilt is
 * deterministic by position (not random) so a chapter looks the same every
 * visit — it should read as "someone placed these", not as jitter.
 */
const TILTS = [-1.5, 1, -0.7, 1.4, -1.1, 0.6];

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
  chapterSlug,
  reactions,
  commentCount,
  currentUserId,
  onSelect,
  onRemove,
}: {
  memory: MemoryWithMedia;
  index: number;
  chapterSlug: string;
  reactions: Reaction[];
  commentCount: number;
  currentUserId: string | null;
  onSelect: () => void;
  /** Asks to remove this print — the caller confirms in a dialog first. */
  onRemove: () => void;
}) {
  const tilt = TILTS[index % TILTS.length];
  const imageUrl = memory.thumbnailUrl ?? memory.mediaUrl;
  if (!imageUrl) return null;

  return (
    <div
      style={{ rotate: `${tilt}deg` }}
      className="group relative transition duration-500 ease-(--ease-bounce) hover:-translate-y-2 hover:scale-[1.02] hover:[rotate:0deg] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left focus-visible:outline-none"
      >
        <div className="relative rounded-2xl bg-[#fffdf7] p-3 pb-4 shadow-[0_12px_24px_-14px_rgba(76,59,48,0.42)] transition duration-700 group-hover:shadow-[0_24px_38px_-18px_rgba(76,59,48,0.45)] group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-accent motion-reduce:transition-none">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink/5">
            <Image
              src={imageUrl}
              alt=""
              fill
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
            {memory.title !== formatMonthDay(toLocalDate(memory.occurred_at)) && (
              <span className="block font-serif text-xl italic leading-tight text-ink">
                {memory.title}
              </span>
            )}
            <div className="mt-1 flex items-center gap-2">
              <time
                dateTime={memory.occurred_at}
                className="block text-[11px] uppercase tracking-[0.18em] text-ink-muted"
              >
                {formatFullDate(memory.occurred_at)}
              </time>
              {commentCount > 0 && (
                <span className="text-[11px] tracking-[0.18em] text-ink-muted">
                  · {commentCount === 1 ? "1 note" : `${commentCount} notes`}
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
        aria-label={`Remove ${memory.title} from this chapter`}
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

      <MemoryReactions
        memoryId={memory.id}
        chapterSlug={chapterSlug}
        reactions={reactions}
        currentUserId={currentUserId}
        variant="corner"
      />    
    </div>
  );
}
