"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { VaultReactions } from "@/components/vault/VaultReactions";
import type { VaultItemView } from "@/lib/vault/types";

/** How long a press has to last before it counts as "hold this and react" rather than "open this" — same figure and reasoning as `MemoryCard`'s `HOLD_MS`. */
const HOLD_MS = 450;
/** How far a finger may travel before the press stops being a press — otherwise every scroll starting on a photo would open a picker on the way past. */
const HOLD_SLOP_PX = 10;

/** A photo-corner mount — same motif as the main book's prints. */
function Corner({ className }: { className: string }) {
  return <span aria-hidden className={`pointer-events-none absolute h-5 w-5 bg-ink/15 ${className}`} />;
}

/**
 * One vault print — the vault's copy of `MemoryCard`, minus the caption/date/
 * kept-by figcaption (vault photos carry no title), plus its own reaction set.
 * Same press-and-hold-to-react gesture, same reasoning for every piece of it —
 * see `MemoryCard`'s comments for the full explanation of `heldRef`, the
 * pointer-based hold timer, and why the outer element is a `div` and not a
 * `button` (the remove control has to be a sibling, not a nested button).
 */
export function VaultCard({
  item,
  tilt,
  currentUserId,
  onSelect,
  onRemove,
  onReactionChange,
}: {
  item: VaultItemView;
  tilt: number;
  currentUserId: string | null;
  onSelect: () => void;
  onRemove: () => void;
  onReactionChange: (emoji: string | null) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdOrigin = useRef<{ x: number; y: number } | null>(null);
  const heldRef = useRef(false);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdOrigin.current = null;
  }, []);

  useEffect(() => cancelHold, [cancelHold]);

  const startHold = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    heldRef.current = false;
    holdOrigin.current = { x: event.clientX, y: event.clientY };
    holdTimer.current = setTimeout(() => {
      heldRef.current = true;
      setPickerOpen(true);
    }, HOLD_MS);
  }, []);

  const moveHold = useCallback(
    (event: React.PointerEvent) => {
      const origin = holdOrigin.current;
      if (!origin) return;
      const travelled = Math.abs(event.clientX - origin.x) + Math.abs(event.clientY - origin.y);
      if (travelled > HOLD_SLOP_PX) cancelHold();
    },
    [cancelHold],
  );

  return (
    <div
      style={{ rotate: `${tilt}deg` }}
      className="group relative transition duration-500 ease-(--ease-bounce) hover:-translate-y-2 hover:scale-[1.02] hover:[rotate:0deg] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
    >
      <button
        type="button"
        onClick={() => {
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
        onContextMenu={(event) => event.preventDefault()}
        className="block w-full select-none text-left [-webkit-touch-callout:none] focus-visible:outline-none"
      >
        <div className="relative rounded-2xl bg-[#fffdf7] p-3 pb-4 shadow-[0_12px_24px_-14px_rgba(76,59,48,0.42)] transition duration-700 group-hover:shadow-[0_24px_38px_-18px_rgba(76,59,48,0.45)] group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-accent motion-reduce:transition-none">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-ink/5">
            {item.thumbnailUrl && (
              <Image
                src={item.thumbnailUrl}
                alt=""
                fill
                draggable={false}
                unoptimized
                loading="lazy"
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
                className="object-cover transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            )}
            <Corner className="left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]" />
            <Corner className="right-0 top-0 [clip-path:polygon(100%_0,100%_100%,0_0)]" />
            <Corner className="bottom-0 left-0 [clip-path:polygon(0_100%,0_0,100%_100%)]" />
            <Corner className="bottom-0 right-0 [clip-path:polygon(100%_100%,0_100%,100%_0)]" />
          </div>
        </div>
      </button>

      <button
        type="button"
        aria-label="Remove this photo"
        onClick={onRemove}
        className="absolute -right-2 -top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-base leading-none text-ink-muted shadow-[0_4px_10px_-4px_rgba(76,59,48,0.5)] transition before:absolute before:-inset-1.5 before:content-[''] hover:scale-110 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        ×
      </button>

      <VaultReactions
        vaultItemId={item.id}
        reactions={item.reactions}
        currentUserId={currentUserId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onReacted={onReactionChange}
      />
    </div>
  );
}
