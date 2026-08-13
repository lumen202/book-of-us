"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  editMemoryCaption,
  loadMemoryFullUrl,
  reactToMemory,
  removeMemory,
  addComment as addChapterComment,
  editMemoryComment,
  removeMemoryComment,
  toggleMemoryResurface,
  unreactToMemory,
} from "@/app/(app)/chapters/[slug]/actions";
import {
  addAlbumComment,
  editAlbumComment,
  editAlbumMemoryCaption,
  loadPromiseAlbumFullUrl,
  reactToAlbumPhoto,
  removeAlbumComment,
  removeAlbumMemory,
  toggleAlbumMemoryResurface,
  unreactToAlbumPhoto,
} from "@/app/(app)/bucket-list/actions";
import {
  addTripComment,
  editTripComment,
  editTripMemoryCaption,
  loadTripMemoryFullUrl,
  reactToTripPhoto,
  removeTripComment,
  removeTripMemory,
  toggleTripMemoryResurface,
  unreactToTripPhoto,
} from "@/app/(app)/trips/actions";
import type { Comment } from "@/lib/comments/types";
import type { BucketCategory } from "@/lib/bucket-list/types";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import type { Reaction } from "@/lib/reactions/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MemoryCard } from "./MemoryCard";
import { MemoryDetail } from "./MemoryDetail";

export type MemoryGridContext =
  | { kind: "chapter"; chapterId: string; chapterSlug: string }
  | { kind: "album"; itemId: string }
  | { kind: "trip"; tripId: string };

/**
 * The one component that knows "chapter" from "bucket-list album" — every
 * other memory component (`MemoryCard`, `MemoryDetail`, `MemoryReactions`,
 * `MemoryComments`) is context-agnostic, taking plain callback props. This
 * binds the right Server Actions for `context.kind` once and hands bound
 * per-memory closures down; the chapter page and the album page each just
 * pass their own `context`, and everything else is identical between them.
 *
 * Reactions and comments were never chapter-specific underneath — see
 * `app/(app)/bucket-list/actions.ts`'s album action set, which calls the
 * exact same `lib/reactions/mutations.ts` / `lib/comments/mutations.ts`
 * functions the chapter's own actions do, just revalidating a different path.
 */
export function bindMemoryActions(context: MemoryGridContext) {
  if (context.kind === "chapter") {
    const { chapterId, chapterSlug } = context;
    return {
      removeLabel: "this chapter",
      removalBody: "It won't be gone for good — it just won't be in this chapter anymore.",
      onRemove: (memoryId: string) => removeMemory(memoryId, chapterSlug),
      onReact: (memoryId: string, emoji: string) => reactToMemory(memoryId, emoji, chapterSlug),
      onUnreact: (memoryId: string) => unreactToMemory(memoryId, chapterSlug),
      onAddComment: (memoryId: string, body: string) => addChapterComment(memoryId, body, chapterSlug),
      onEditComment: (commentId: string, body: string) => editMemoryComment(commentId, body, chapterSlug),
      onRemoveComment: (commentId: string) => removeMemoryComment(commentId, chapterSlug),
      onEditCaption: (memoryId: string, title: string) => editMemoryCaption(memoryId, title, chapterSlug),
      onToggleResurface: (memoryId: string, excluded: boolean) =>
        toggleMemoryResurface(memoryId, excluded, chapterSlug),
      resolveFullUrl: (memoryId: string) => loadMemoryFullUrl(chapterId, memoryId),
    };
  }

  if (context.kind === "album") {
    const { itemId } = context;
    return {
      removeLabel: "this album",
      removalBody: "It won't be gone for good — it just won't be in this album anymore.",
      onRemove: (memoryId: string) => removeAlbumMemory(memoryId, itemId),
      onReact: (memoryId: string, emoji: string) => reactToAlbumPhoto(memoryId, emoji, itemId),
      onUnreact: (memoryId: string) => unreactToAlbumPhoto(memoryId, itemId),
      onAddComment: (memoryId: string, body: string) => addAlbumComment(memoryId, body, itemId),
      onEditComment: (commentId: string, body: string) => editAlbumComment(commentId, body, itemId),
      onRemoveComment: (commentId: string) => removeAlbumComment(commentId, itemId),
      onEditCaption: (memoryId: string, title: string) => editAlbumMemoryCaption(memoryId, title, itemId),
      onToggleResurface: (memoryId: string, excluded: boolean) =>
        toggleAlbumMemoryResurface(memoryId, excluded, itemId),
      resolveFullUrl: (memoryId: string) => loadPromiseAlbumFullUrl(itemId, memoryId),
    };
  }

  const { tripId } = context;
  return {
    removeLabel: "this trip",
    removalBody: "It won't be gone for good — it just won't be filed under this trip anymore.",
    onRemove: (memoryId: string) => removeTripMemory(memoryId, tripId),
    onReact: (memoryId: string, emoji: string) => reactToTripPhoto(memoryId, emoji, tripId),
    onUnreact: (memoryId: string) => unreactToTripPhoto(memoryId, tripId),
    onAddComment: (memoryId: string, body: string) => addTripComment(memoryId, body, tripId),
    onEditComment: (commentId: string, body: string) => editTripComment(commentId, body, tripId),
    onRemoveComment: (commentId: string) => removeTripComment(commentId, tripId),
    onEditCaption: (memoryId: string, title: string) => editTripMemoryCaption(memoryId, title, tripId),
    onToggleResurface: (memoryId: string, excluded: boolean) =>
      toggleTripMemoryResurface(memoryId, excluded, tripId),
    resolveFullUrl: (memoryId: string) => loadTripMemoryFullUrl(tripId, memoryId),
  };
}

/**
 * A chapter (or a bucket-list album) reads as a page in a photo album, not a
 * grid of cards: one sheet of album paper, prints mounted onto it at slight
 * angles, captions written underneath. Prints settle in one after another
 * rather than all at once so the page feels turned-to rather than loaded.
 *
 * The layout below is a plain grid, not CSS multi-column, despite every print
 * being roughly the same height (fixed `aspect-[4/5]` photo + a short
 * caption) — which made `columns-*` tempting for the masonry look. Don't go
 * back to it: `column-fill` can only *balance* columns against a container
 * with a determinate height, and this container's height is intrinsic (it
 * grows with its content). With few prints — which is the common case for a
 * chapter that's just been started — the browser fills column one completely
 * and never spills into the others, so two photos rendered as one tall column
 * with the whole right side of the page empty. A grid distributes left to
 * right regardless of count, which is what actually fixes it.
 */
export function MemoryGrid({
  memories,
  context,
  reactionsByMemory,
  commentsByMemory,
  currentUserId,
  albumInfoByItemId,
}: {
  memories: MemoryWithMedia[];
  context: MemoryGridContext;
  reactionsByMemory: Record<string, Reaction[]>;
  commentsByMemory: Record<string, Comment[]>;
  currentUserId: string | null;
  /**
   * Category + title for whichever promises have a photo on this page —
   * only meaningful from a chapter (`context.kind === "chapter"`), since
   * that's the only place a print can belong to a promise without every
   * other print on the page belonging to the same one. Absent entirely from
   * an album page's own call — inside an album, every photo already shares
   * one promise, so badging each one would be noise, not information.
   */
  albumInfoByItemId?: Map<string, { category: BucketCategory; title: string }>;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The print whose × was clicked — the dialog is open while this is set. */
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [, startTransition] = useTransition();

  const actions = bindMemoryActions(context);
  const selected = memories.find((memory) => memory.id === selectedId) ?? null;
  const pendingRemoval = memories.find((memory) => memory.id === pendingRemovalId) ?? null;

  // What prev/next walks through: the prints on this page that open in the
  // detail view. From a chapter that excludes promise covers — clicking one
  // navigates away to its album (see `onSelect` below), so stepping "into"
  // one mid-walk would silently swap a modal for a page change.
  const navigable =
    context.kind === "chapter"
      ? memories.filter((memory) => !memory.bucket_list_item_id)
      : memories;
  const selectedIndex = selected ? navigable.findIndex((memory) => memory.id === selected.id) : -1;
  const prevMemory = selectedIndex > 0 ? navigable[selectedIndex - 1] : null;
  const nextMemory =
    selectedIndex >= 0 && selectedIndex < navigable.length - 1
      ? navigable[selectedIndex + 1]
      : null;

  function confirmRemoval() {
    if (!pendingRemovalId) return;
    setRemoving(true);
    startTransition(async () => {
      try {
        await actions.onRemove(pendingRemovalId);
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

        <div className="relative grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, delay: Math.min(index, 5) * 0.09, ease: "easeOut" }}
            >
              <MemoryCard
                memory={memory}
                index={index}
                reactions={reactionsByMemory[memory.id] ?? []}
                commentCount={(commentsByMemory[memory.id] ?? []).length}
                currentUserId={currentUserId}
                album={
                  context.kind === "chapter" && memory.bucket_list_item_id
                    ? (albumInfoByItemId?.get(memory.bucket_list_item_id) ?? null)
                    : null
                }
                onSelect={() => {
                  // A promise's cover print opens its whole album, not just
                  // itself as an isolated photo — the chapter is one page of
                  // it, not the only place it lives. Only relevant from a
                  // chapter: inside an album already, every photo shares the
                  // same promise, so there's nowhere further to redirect to.
                  // See `docs/agent/codebase-map/bucket-list.md`.
                  if (context.kind === "chapter" && memory.bucket_list_item_id) {
                    router.push(
                      `/bucket-list/${memory.bucket_list_item_id}?from=/chapters/${context.chapterSlug}`,
                    );
                    return;
                  }
                  setSelectedId(memory.id);
                }}
                onRemove={() => setPendingRemovalId(memory.id)}
                removeLabel={actions.removeLabel}
                onReact={(emoji) => actions.onReact(memory.id, emoji)}
                onUnreact={() => actions.onUnreact(memory.id)}
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
            // Stable across prev/next steps on purpose: `useCloseOnBack`
            // pushes a history entry per mount, so a `selected.id` key here
            // would stack one entry for every print stepped past. The detail
            // resets its own per-memory state when the prop changes.
            key="memory-detail"
            memory={selected}
            reactions={reactionsByMemory[selected.id] ?? []}
            comments={commentsByMemory[selected.id] ?? []}
            currentUserId={currentUserId}
            onClose={() => setSelectedId(null)}
            onEditCaption={(title) => actions.onEditCaption(selected.id, title)}
            onToggleResurface={(excluded) => actions.onToggleResurface(selected.id, excluded)}
            resolveFullUrl={() => actions.resolveFullUrl(selected.id)}
            onReact={(emoji) => actions.onReact(selected.id, emoji)}
            onUnreact={() => actions.onUnreact(selected.id)}
            onAddComment={(body) => actions.onAddComment(selected.id, body)}
            onEditComment={(commentId, body) => actions.onEditComment(commentId, body)}
            onRemoveComment={(commentId) => actions.onRemoveComment(commentId)}
            onPrev={prevMemory ? () => setSelectedId(prevMemory.id) : undefined}
            onNext={nextMemory ? () => setSelectedId(nextMemory.id) : undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRemoval && (
          <ConfirmDialog
            key={pendingRemoval.id}
            title="Take this one off the page?"
            body={actions.removalBody}
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
