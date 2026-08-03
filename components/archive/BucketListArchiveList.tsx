"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  purgeBucketItemAction,
  purgeBucketItemsAction,
  restoreBucketItemAction,
} from "@/app/(app)/archive/actions";
import { formatFullDate } from "@/lib/format/date";
import type { BucketListItem } from "@/lib/bucket-list/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CategoryGlyph } from "@/components/bucket-list/CategoryGlyph";

/**
 * The bucket list's copy of `ArchiveList`/`VaultArchiveList` — same restore/
 * purge shape, kept as its own component for the same reason `VaultArchiveList`
 * is (`DeletedVaultItem` vs `BucketListItem` are differently shaped, and their
 * own separate Server Actions). No thumbnail: bucket-list promises carry no
 * images of their own, same "shown with text, not pictures" rule the list
 * page itself follows — a removed promise's photos, if any, are untouched by
 * removal and stay reachable via their chapter regardless of what happens
 * here (see `purgeItem` in `lib/bucket-list/mutations.ts`).
 */
export function BucketListArchiveList({ items }: { items: BucketListItem[] }) {
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
        const { purged, failed } = await purgeBucketItemsAction(selectedIds);
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
        No promises removed from the list.
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
              className={`flex items-center gap-4 rounded-2xl border p-3 transition ${
                isSelected ? "border-accent bg-surface" : "border-border bg-surface/80"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(item.id)}
                aria-label="Select this promise"
                className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
              />

              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink-muted">
                <CategoryGlyph category={item.category} className="h-6 w-6" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-lg italic text-ink">{item.title}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                  removed {item.deletedAt ? formatFullDate(item.deletedAt.slice(0, 10)) : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runOne(item.id, () => restoreBucketItemAction(item.id))}
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
            title="Delete this promise for good?"
            body="Its row is erased permanently — any photos already kept for it are untouched and stay wherever they already live. This one cannot be undone."
            confirmLabel="Delete permanently"
            cancelLabel="Keep it"
            busy={busyId === pendingSingleId}
            onConfirm={() => runOne(pendingSingleId, () => purgeBucketItemAction(pendingSingleId))}
            onCancel={() => !busyId && setPendingSingleId(null)}
          />
        )}

        {confirmingBulk && (
          <ConfirmDialog
            key="bulk"
            title={`Delete ${selectedIds.length} ${selectedIds.length === 1 ? "promise" : "promises"} for good?`}
            body="Every row in the selection is erased permanently. Any photos already kept for them are untouched. This cannot be undone."
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
