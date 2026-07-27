"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { reactToMemory, unreactToMemory } from "@/app/(app)/chapters/[slug]/actions";
import { REACTION_EMOJIS } from "@/lib/reactions/types";
import type { Reaction } from "@/lib/reactions/types";

/**
 * Emoji reactions — a small, curated set (see `lib/reactions/types.ts`) each
 * person can leave one of on a print, changeable any time.
 *
 * Two shapes for two places:
 *
 * - **`corner`** (the album grid): a small sticker in the print's bottom-left
 *   corner, matching the photo-corner-mount motif already there. Tapping it
 *   opens a compact picker row above it; picking the emoji you already have
 *   removes it, picking another swaps it.
 * - **`inline`** (the lifted detail view): the picker row sits in the open,
 *   under the caption, with your current pick highlighted — there's room
 *   here, so nothing needs to hide behind a tap first.
 *
 * Reactions are aggregated by emoji rather than shown per-person: with only
 * two people in this book, "who reacted" is rarely the interesting part, and
 * a stack of tiny avatars would be the first genuinely app-like thing on the
 * page. What shows is *what* was felt, not a scoreboard of who felt it.
 */
export function MemoryReactions({
  memoryId,
  chapterSlug,
  reactions,
  currentUserId,
  variant,
}: {
  memoryId: string;
  chapterSlug: string;
  reactions: Reaction[];
  currentUserId: string | null;
  variant: "corner" | "inline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Shows the tap immediately instead of waiting on the round trip to the
  // server action + `router.refresh()`. React reverts this back to the real
  // `reactions` prop on its own if the action throws, and settles onto the
  // (matching) server value once the refresh lands — no manual reconciling.
  const [optimisticReactions, setOptimisticReaction] = useOptimistic(
    reactions,
    (state, nextEmoji: string | null) => {
      const withoutMine = state.filter((r) => r.userId !== currentUserId);
      return nextEmoji && currentUserId
        ? [...withoutMine, { memoryId, userId: currentUserId, emoji: nextEmoji }]
        : withoutMine;
    },
  );

  const mine = currentUserId
    ? optimisticReactions.find((r) => r.userId === currentUserId)?.emoji ?? null
    : null;
  const present = Array.from(new Set(optimisticReactions.map((r) => r.emoji)));

  function choose(emoji: string) {
    if (!currentUserId) return;
    setOpen(false);
    const nextEmoji = emoji === mine ? null : emoji;
    startTransition(async () => {
      setOptimisticReaction(nextEmoji);
      if (nextEmoji === null) {
        await unreactToMemory(memoryId, chapterSlug);
      } else {
        await reactToMemory(memoryId, emoji, chapterSlug);
      }
      router.refresh();
    });
  }

  if (variant === "inline") {
    return (
      <div className="mt-6 flex items-center gap-2">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => choose(emoji)}
            aria-pressed={emoji === mine}
            aria-label={emoji === mine ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full border text-lg transition before:absolute before:-inset-1 before:content-[''] hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent motion-reduce:hover:scale-100 ${
              emoji === mine
                ? "border-accent bg-accent-muted"
                : "border-border bg-surface hover:border-accent/60"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className="absolute -bottom-2 -right-2"
      // Reactions live outside the "lift this print" button (a sibling, same
      // as the remove control) — nested buttons would be invalid HTML and the
      // inner ones would stop being reachable by keyboard.
      onClick={(event) => event.stopPropagation()}
    >
      {open && (
        // Buttons here are sized up to 40px (rather than padded out with an
        // invisible hit-slop like the solitary buttons elsewhere) because
        // they sit right next to each other — an overlapping invisible hit
        // area would just move the mis-tap problem to "which neighbour did
        // that register on" instead of fixing it.
        <div className="absolute bottom-full right-0 mb-2 flex gap-1.5 rounded-full border border-border bg-surface px-2 py-1.5 shadow-[0_10px_20px_-10px_rgba(76,59,48,0.5)]">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => choose(emoji)}
              aria-pressed={emoji === mine}
              aria-label={emoji === mine ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent motion-reduce:hover:scale-100 ${
                emoji === mine ? "bg-accent-muted" : "hover:bg-background"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={present.length > 0 ? `${present.join(" ")} — change your reaction` : "React to this photo"}
        // Visual size stays 32px; `before` pads the tappable area out to the
        // ~44px touch-target minimum without adding paint — safe here since,
        // unlike the picker row above, there's no neighbouring button for an
        // invisible hit area to collide with.
        className="relative flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-full border border-border bg-surface px-1.5 text-sm leading-none shadow-[0_4px_10px_-4px_rgba(76,59,48,0.5)] transition before:absolute before:-inset-1.5 before:content-[''] hover:scale-110 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
      >
        {present.length > 0 ? present.join("") : <span className="text-ink-muted">♡</span>}
      </button>
    </div>
  );
}
