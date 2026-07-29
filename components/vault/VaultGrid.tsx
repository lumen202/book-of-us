"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  addVaultItem,
  getVaultItemFullUrl,
  removeVaultItem,
} from "@/app/(app)/vault/actions";
import { useCloseOnBack } from "@/lib/navigation/useCloseOnBack";
import { uploadVaultMedia } from "@/lib/vault/uploadVaultMedia";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { VaultCard } from "@/components/vault/VaultCard";
import type { VaultItemView } from "@/lib/vault/types";

/** Prints are never laid down perfectly straight — same deterministic tilt-by-position idea as `MemoryCard`'s `TILTS`, its own array so the two galleries don't visually sync. */
const TILTS = [-1.8, 1.4, -1, 2, -1.5, 1.1];

export function VaultGrid({
  initialItems,
  currentUserId,
}: {
  initialItems: VaultItemView[];
  currentUserId: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [lightbox, setLightbox] = useState<{ id: string; url: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const id = crypto.randomUUID();
        const uploaded = await uploadVaultMedia(file, { itemId: id });
        await addVaultItem({
          id,
          title: null,
          storagePath: uploaded.storagePath,
          thumbnailPath: uploaded.thumbnailPath,
          meta: uploaded.meta,
        });

        // A local object URL rather than waiting on a signed one — the photo
        // is already on this device, so there's no reason to round-trip for
        // a preview of something the browser is already holding in memory.
        setItems((current) => [
          {
            id,
            title: null,
            createdAt: new Date().toISOString(),
            storagePath: uploaded.storagePath,
            thumbnailUrl: URL.createObjectURL(file),
            reactions: [],
          },
          ...current,
        ]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That upload didn't work.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function openLightbox(item: VaultItemView) {
    setLightbox({ id: item.id, url: null });
    const url = await getVaultItemFullUrl(item.storagePath);
    setLightbox((current) => (current?.id === item.id ? { id: item.id, url } : current));
  }

  async function confirmRemove() {
    if (!pendingRemoveId) return;
    setRemoving(true);
    try {
      await removeVaultItem(pendingRemoveId);
      setItems((current) => current.filter((item) => item.id !== pendingRemoveId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work.");
    } finally {
      setRemoving(false);
      setPendingRemoveId(null);
    }
  }

  /**
   * Writes a settled reaction back into `items` once the server action
   * confirms it, so the next render hands `VaultReactions` a `reactions` prop
   * that already agrees with what its own `useOptimistic` predicted.
   *
   * Without this, `reactions` never changes after the initial `unlockVault`
   * fetch — the vault page is client-only and one-shot, unlike the main
   * book's chapter pages, so there's no server re-render to revalidate into.
   * `useOptimistic` reconciles its optimistic value against this same `items`
   * state as its "base" the moment the transition settles; if the base is
   * still the pre-click reaction, that's what briefly flashes back before the
   * next interaction happens to paper over it. See the log entry on this fix.
   */
  function updateReaction(itemId: string, emoji: string | null) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const withoutMine = item.reactions.filter((r) => r.userId !== currentUserId);
        const reactions =
          emoji && currentUserId
            ? [...withoutMine, { vaultItemId: itemId, userId: currentUserId, emoji }]
            : withoutMine;
        return { ...item, reactions };
      }),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 pb-24 pt-8">
      <Link
        href="/"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the shelf
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Private</span>
          <h1 className="ink-legible font-serif text-4xl leading-tight text-ink">Just for us.</h1>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-full bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-surface transition hover:brightness-95 disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {uploading ? "Adding…" : "Add a photo"}
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-accent/40 bg-surface px-4 py-3 text-sm text-accent">{error}</p>
      )}

      {items.length === 0 ? (
        <p className="ink-legible font-serif text-xl italic text-ink-muted">Nothing here yet.</p>
      ) : (
        // Single column on phones, same as the main book's `MemoryGrid` — a
        // dense multi-column thumbnail wall is the desktop-width version of
        // this, not the mobile one.
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <VaultCard
              key={item.id}
              item={item}
              tilt={TILTS[index % TILTS.length]}
              currentUserId={currentUserId}
              onSelect={() => openLightbox(item)}
              onRemove={() => setPendingRemoveId(item.id)}
              onReactionChange={(emoji) => updateReaction(item.id, emoji)}
            />
          ))}
        </div>
      )}

      {lightbox && <VaultLightbox url={lightbox.url} onClose={() => setLightbox(null)} />}

      {pendingRemoveId && (
        <ConfirmDialog
          title="Remove this photo?"
          body="It'll come off the vault right away."
          confirmLabel="Remove it"
          busy={removing}
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemoveId(null)}
        />
      )}
    </div>
  );
}

/** Its own component so it only claims a history entry while it's actually mounted — see `useCloseOnBack`. */
function VaultLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  useCloseOnBack(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-6"
      onClick={onClose}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="max-h-full max-w-full rounded-lg object-contain"
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <p className="text-sm uppercase tracking-[0.2em] text-surface">Loading…</p>
      )}
    </div>
  );
}
