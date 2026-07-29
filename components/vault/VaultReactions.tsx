"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { reactToVaultItem, unreactToVaultItem } from "@/app/(app)/vault/actions";
import type { VaultReaction } from "@/lib/vault/reactions";

/** A curated set fitting the vault's own mood, not the main book's ❤️😂🥹😮😍 — see `lib/vault/reactions.ts`. */
const VAULT_REACTION_EMOJIS = ["🔥", "😏", "🥵", "😈", "💦"] as const;

/**
 * The vault's copy of `MemoryReactions`' `corner` variant — a small sticker in
 * the print's corner, tap to reveal a picker row, pick your emoji or pick it
 * again to remove it.
 *
 * `open`/`onOpenChange` are optional, same as `MemoryReactions`: passing them
 * hands the picker's open state to the caller, so `VaultGrid`'s press-and-hold
 * gesture on the print itself can drive the same picker the corner sticker
 * does, rather than the two opening two different ones.
 */
export function VaultReactions({
  vaultItemId,
  reactions,
  currentUserId,
  open: controlledOpen,
  onOpenChange,
  onReacted,
}: {
  vaultItemId: string;
  reactions: VaultReaction[];
  currentUserId: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Fired once the server action confirms the change, with the new emoji (or
   * `null` for a removal). `VaultGrid` uses this to write the reaction back
   * into its own `items` state — this component's `useOptimistic` reconciles
   * against the `reactions` prop the instant the transition settles, and
   * without a caller keeping that prop current the optimistic value flashes
   * back to the pre-click emoji (the vault page is client-only and one-shot,
   * so nothing else ever refreshes it). See `VaultGrid.updateReaction`.
   */
  onReacted?: (emoji: string | null) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [, startTransition] = useTransition();
  const cornerRef = useRef<HTMLDivElement>(null);

  const [optimisticReactions, setOptimisticReaction] = useOptimistic(
    reactions,
    (state, nextEmoji: string | null) => {
      const withoutMine = state.filter((r) => r.userId !== currentUserId);
      return nextEmoji && currentUserId
        ? [...withoutMine, { vaultItemId, userId: currentUserId, emoji: nextEmoji }]
        : withoutMine;
    },
  );

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!cornerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
      if (nextEmoji === null) await unreactToVaultItem(vaultItemId);
      else await reactToVaultItem(vaultItemId, emoji);
      onReacted?.(nextEmoji);
    });
  }

  return (
    <div ref={cornerRef} className="absolute -bottom-2 -right-2" onClick={(event) => event.stopPropagation()}>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 flex gap-1.5 rounded-full border border-border bg-surface px-2 py-1.5 shadow-[0_10px_20px_-10px_rgba(76,59,48,0.5)]">
          {VAULT_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => choose(emoji)}
              aria-pressed={emoji === mine}
              aria-label={emoji === mine ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
              className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-lg transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent motion-reduce:hover:scale-100 ${
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
        onClick={() => setOpen(!open)}
        aria-label={present.length > 0 ? `${present.join(" ")} — change your reaction` : "React to this photo"}
        className="relative flex h-8 min-w-8 cursor-pointer items-center justify-center gap-0.5 rounded-full border border-border bg-surface px-1.5 text-sm leading-none shadow-[0_4px_10px_-4px_rgba(76,59,48,0.5)] transition before:absolute before:-inset-1.5 before:content-[''] hover:scale-110 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:scale-100"
      >
        {present.length > 0 ? present.join("") : <span className="text-ink-muted">♡</span>}
      </button>
    </div>
  );
}
