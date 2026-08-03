"use client";

import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  purgeVaultItemAction,
  purgeVaultItemsAction,
  restoreVaultItemAction,
} from "@/app/(app)/archive/actions";
import { formatFullDate } from "@/lib/format/date";
import type { DeletedVaultItem } from "@/lib/vault/queries";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * The vault's copy of `ArchiveList` — same restore/purge shape, no captions
 * (vault photos carry no title), removed-date only. Kept as its own component
 * rather than a generic one shared with `ArchiveList`: the two operate on
 * differently-shaped data (`MemoryWithMedia` vs `DeletedVaultItem`) and their
 * own separate Server Actions, and forcing one component to abstract over
 * both would cost more than the ~150 lines it would save.
 */
export function VaultArchiveList({ items }: { items: DeletedVaultItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingSingleId, setPendingSingleId] = useState<string | null>(null);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const present = new Set(items.map((item) => item.id));
  const selectedIds = [...selected].filter((id) => present.has(id));
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  function runOne(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That didn't work.");
      } finally {
        setBusyId(null);
        setPendingSingleId(null);
      }
    });
  }

  function runBulk() {
    setBulkBusy(true);
    setError(null);
    startTransition(async () => {
      try {
        const { purged, failed } = await purgeVaultItemsAction(selectedIds);
        if (failed) setError(`Deleted ${purged} of ${selectedIds.length} before stopping: ${failed}`);
        setSelected(new Set());
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That didn't work.");
      } finally {
        setBulkBusy(false);
        setConfirmingBulk(false);
      }
    });
  }

  if (items.length === 0) {
    return (
      <p className="ink-legible font-serif text-xl italic text-ink-muted">
        Nothing removed from the vault.
      </p>
    );
  }

  return (
    <>
      {error && (
        <p className="rounded-2xl border border-accent/40 bg-surface px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Select all
        </label>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setConfirmingBulk(true)}
              className="cursor-pointer rounded-full border border-accent px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-accent transition hover:bg-accent hover:text-surface disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {bulkBusy ? "Deleting…" : "Delete selected forever"}
            </button>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const busy = busyId === item.id || bulkBusy;
          const isSelected = selected.has(item.id);

          return (
            <li
              key={item.id}
              className={`flex flex-col gap-3 rounded-2xl border p-3 transition sm:flex-row sm:items-center sm:gap-4 ${
                isSelected ? "border-accent bg-surface" : "border-border bg-surface/80"
              }`}
            >
              <div className="flex min-w-0 items-center gap-4 sm:flex-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(item.id)}
                  aria-label="Select this photo"
                  className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />

                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink/5">
                  {item.thumbnailUrl && (
                    <Image src={item.thumbnailUrl} alt="" fill unoptimized className="object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    removed {formatFullDate(item.deletedAt.slice(0, 10))}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runOne(item.id, () => restoreVaultItemAction(item.id))}
                  className="cursor-pointer rounded-full bg-accent px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-surface transition hover:brightness-95 disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {busyId === item.id ? "…" : "Put back"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingSingleId(item.id)}
                  className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Delete forever
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {pendingSingleId && (
          <ConfirmDialog
            key={pendingSingleId}
            title="Delete this for good?"
            body="The photo file and its record are erased permanently. This one cannot be undone."
            confirmLabel="Delete permanently"
            cancelLabel="Keep it"
            busy={busyId === pendingSingleId}
            onConfirm={() => runOne(pendingSingleId, () => purgeVaultItemAction(pendingSingleId))}
            onCancel={() => !busyId && setPendingSingleId(null)}
          />
        )}

        {confirmingBulk && (
          <ConfirmDialog
            key="bulk"
            title={`Delete ${selectedIds.length} ${selectedIds.length === 1 ? "photo" : "photos"} for good?`}
            body="Every file and record in the selection is erased permanently. This cannot be undone."
            confirmLabel="Delete them permanently"
            cancelLabel="Keep them"
            busy={bulkBusy}
            onConfirm={runBulk}
            onCancel={() => !bulkBusy && setConfirmingBulk(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
