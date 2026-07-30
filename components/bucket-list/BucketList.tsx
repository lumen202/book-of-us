"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { editPromise, removePromise, reopenPromise } from "@/app/(app)/bucket-list/actions";
import type { BucketListItem, BucketCategory } from "@/lib/bucket-list/types";
import type { MemoryChapterLink } from "@/lib/memories/queries";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddPromiseModal } from "./AddPromiseModal";
import { BucketItemRow } from "./BucketItemRow";
import { CompletionModal } from "./CompletionModal";

/**
 * A page of the book, not a task manager — see `docs/plans/bucket-list.md`
 * §0.1. Two sections only (open, kept), no filter chips: ten promises don't
 * need them, and the trigger for adding grouping later is written down
 * there — more than ~25 open items.
 *
 * Ticking, renaming and reordering are the optimistic part of this page.
 * Completion is not: it writes a photo to storage and two tables, so
 * showing "kept" before that lands would show a promise kept that isn't
 * actually recorded yet. `CompletionModal` owns that whole wait; this
 * component just decides which item, if any, currently has one open.
 */
export function BucketList({
  items,
  memoryLinks,
  currentUserId,
}: {
  items: BucketListItem[];
  memoryLinks: MemoryChapterLink[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [adding, setAdding] = useState(false);

  const linksByMemory = useMemo(() => {
    const map = new Map<string, { chapterSlug: string; chapterTitle: string }>();
    for (const link of memoryLinks) {
      map.set(link.memoryId, { chapterSlug: link.chapterSlug, chapterTitle: link.chapterTitle });
    }
    return map;
  }, [memoryLinks]);

  const open = items.filter((item) => item.status === "open");
  const done = [...items.filter((item) => item.status === "done")].sort((a, b) =>
    (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
  );

  const completingItem = items.find((item) => item.id === completingId) ?? null;
  const attachingItem = items.find((item) => item.id === attachingId) ?? null;
  const pendingRemoval = items.find((item) => item.id === pendingRemovalId) ?? null;

  async function handleSave(
    id: string,
    updates: { title?: string; note?: string; category?: BucketCategory },
  ) {
    await editPromise(id, updates);
    router.refresh();
  }

  function confirmRemoval() {
    if (!pendingRemovalId) return;
    setRemoving(true);
    startTransition(async () => {
      try {
        await removePromise(pendingRemovalId);
        router.refresh();
      } finally {
        setRemoving(false);
        setPendingRemovalId(null);
      }
    });
  }

  function handleReopen(id: string) {
    startTransition(async () => {
      await reopenPromise(id);
      router.refresh();
    });
  }

  return (
    <>
      <div className="relative rounded-[2rem] bg-surface/75 px-5 py-8 shadow-[0_30px_60px_-45px_rgba(43,23,29,0.75)] sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-[0.5]"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 60%)",
          }}
        />

        <div className="relative flex flex-col divide-y divide-border/60">
          {open.length === 0 && done.length === 0 ? (
            <p className="py-6 max-w-md font-serif text-xl italic text-ink-muted">
              Nothing written down yet. The first promise will find its way here.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {open.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.04, ease: "easeOut" }}
                  className="py-1"
                >
                  <BucketItemRow
                    item={item}
                    memoryLink={null}
                    isCompleting={completingId === item.id}
                    currentUserId={currentUserId}
                    onTick={() => setCompletingId(item.id)}
                    onReopen={() => {}}
                    onAttachPhoto={() => {}}
                    onSave={(updates) => handleSave(item.id, updates)}
                    onAskRemove={() => setPendingRemovalId(item.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          <div className="py-1">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="group flex w-full items-center gap-3 py-2 text-left focus-visible:outline-none"
            >
              <span
                aria-hidden
                className="text-lg leading-none text-ink-muted transition group-hover:text-accent"
              >
                +
              </span>
              <span className="font-serif text-lg italic text-ink-muted transition group-hover:text-ink">
                and one day, we&apos;ll…
              </span>
            </button>
          </div>

          {done.length > 0 && (
            <div className="pt-6">
              <p className="ink-legible text-[11px] uppercase tracking-[0.28em] text-ink-muted">
                Kept promises
              </p>
              <div className="mt-3 flex flex-col divide-y divide-border/40">
                <AnimatePresence initial={false}>
                  {done.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-1"
                    >
                      <BucketItemRow
                        item={item}
                        memoryLink={item.memoryId ? linksByMemory.get(item.memoryId) ?? null : null}
                        isCompleting={false}
                        currentUserId={currentUserId}
                        onTick={() => {}}
                        onReopen={() => handleReopen(item.id)}
                        onAttachPhoto={() => setAttachingId(item.id)}
                        onSave={(updates) => handleSave(item.id, updates)}
                        onAskRemove={() => setPendingRemovalId(item.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {completingItem && (
        <CompletionModal
          key={completingItem.id}
          item={completingItem}
          mode="complete"
          onClose={() => setCompletingId(null)}
          onDone={() => {
            setCompletingId(null);
            router.refresh();
          }}
        />
      )}

      {attachingItem && (
        <CompletionModal
          key={`attach-${attachingItem.id}`}
          item={attachingItem}
          mode="attach"
          onClose={() => setAttachingId(null)}
          onDone={() => {
            setAttachingId(null);
            router.refresh();
          }}
        />
      )}

      <AnimatePresence>
        {pendingRemoval && (
          <ConfirmDialog
            key={pendingRemoval.id}
            title="Take this promise off the list?"
            body="If it's already kept, the photograph stays right where it is — this only removes the line."
            confirmLabel="Remove it"
            busy={removing}
            onConfirm={confirmRemoval}
            onCancel={() => !removing && setPendingRemovalId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adding && (
          <AddPromiseModal
            onClose={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
