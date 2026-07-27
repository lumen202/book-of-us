"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeMemory } from "@/app/(app)/chapters/[slug]/actions";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import type { Reaction } from "@/lib/reactions/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MemoryCard } from "./MemoryCard";
import { MemoryDetail } from "./MemoryDetail";

/**
 * A chapter reads as a page in a photo album, not a grid of cards: one sheet
 * of album paper, prints mounted onto it at slight angles, captions written
 * underneath. Prints settle in one after another rather than all at once so
 * the page feels turned-to rather than loaded.
 */
export function MemoryGrid({
  memories,
  chapterSlug,
  reactionsByMemory,
  currentUserId,
}: {
  memories: MemoryWithMedia[];
  chapterSlug: string;
  reactionsByMemory: Record<string, Reaction[]>;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The print whose × was clicked — the dialog is open while this is set. */
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [, startTransition] = useTransition();

  const selected = memories.find((memory) => memory.id === selectedId) ?? null;
  const pendingRemoval = memories.find((memory) => memory.id === pendingRemovalId) ?? null;

  function confirmRemoval() {
    if (!pendingRemovalId) return;
    setRemoving(true);
    startTransition(async () => {
      try {
        await removeMemory(pendingRemovalId, chapterSlug);
        router.refresh();
      } finally {
        setRemoving(false);
        setPendingRemovalId(null);
      }
    });
  }

  if (memories.length === 0) {
    return (
      <p className="max-w-xl font-serif text-xl italic text-ink-muted">
        This page is still blank. The first keepsake will find its way here.
      </p>
    );
  }

  return (
    <>
      <div className="relative rounded-[2rem] bg-surface/75 px-5 py-8 shadow-[0_30px_60px_-45px_rgba(43,23,29,0.75)] sm:px-10 sm:py-12">
        {/* album paper: a faint grain and a warm bloom, kept well under the
            contrast of anything printed on top of it */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-[0.5]"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 60%)",
          }}
        />

        <div className="relative columns-1 gap-8 sm:columns-2 lg:columns-3 [&>*]:mb-9">
          {memories.map((memory, index) => (
            <motion.div
              key={memory.id}
              className="break-inside-avoid"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, delay: Math.min(index, 5) * 0.09, ease: "easeOut" }}
            >
              <MemoryCard
                memory={memory}
                index={index}
                chapterSlug={chapterSlug}
                reactions={reactionsByMemory[memory.id] ?? []}
                currentUserId={currentUserId}
                onSelect={() => setSelectedId(memory.id)}
                onRemove={() => setPendingRemovalId(memory.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* AnimatePresence so the detail's fold-away actually plays before it
          unmounts — without it the exit variants are dead code. */}
      <AnimatePresence>
        {selected && (
          <MemoryDetail
            key={selected.id}
            memory={selected}
            chapterSlug={chapterSlug}
            reactions={reactionsByMemory[selected.id] ?? []}
            currentUserId={currentUserId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRemoval && (
          <ConfirmDialog
            key={pendingRemoval.id}
            title="Take this one off the page?"
            body="It won't be gone for good — it just won't be in this chapter anymore."
            confirmLabel="Take it off"
            busy={removing}
            onConfirm={confirmRemoval}
            onCancel={() => !removing && setPendingRemovalId(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
