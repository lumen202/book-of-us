"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useTransition } from "react";
import { formatFullDate } from "@/lib/format/date";
import type { Comment } from "@/lib/comments/types";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import type { Reaction } from "@/lib/reactions/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { bindMemoryActions, MemoryGrid } from "@/components/memory/MemoryGrid";
import { MemoryDetail } from "@/components/memory/MemoryDetail";

/** A photo corner mount — matches `MemoryCard`'s, for visual continuity with the chapter pages. */
function Corner({ className }: { className: string }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute h-5 w-5 bg-ink/15 ${className}`} />
  );
}

/** The featured cover — bigger than a grid tile, centered, resting flat (no tilt, it's the title page, not a loose print). */
function CoverCard({
  photo,
  onSelect,
  onRemove,
}: {
  photo: MemoryWithMedia;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const imageUrl = photo.thumbnailUrl ?? photo.mediaUrl;
  if (!imageUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-xs"
    >
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={(event) => event.preventDefault()}
        className="group block w-full select-none text-left [-webkit-touch-callout:none] focus-visible:outline-none"
      >
        <div className="relative rounded-2xl bg-[#fffdf7] p-3 pb-4 shadow-[0_20px_36px_-18px_rgba(76,59,48,0.5)] transition duration-700 group-hover:shadow-[0_26px_44px_-18px_rgba(76,59,48,0.55)] group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-accent motion-reduce:transition-none">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink/5">
            <Image
              src={imageUrl}
              alt=""
              fill
              draggable={false}
              unoptimized
              sizes="320px"
              className="object-cover transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <Corner className="left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]" />
            <Corner className="right-0 top-0 [clip-path:polygon(100%_0,100%_100%,0_0)]" />
            <Corner className="bottom-0 left-0 [clip-path:polygon(0_100%,0_0,100%_100%)]" />
            <Corner className="bottom-0 right-0 [clip-path:polygon(100%_100%,0_100%,100%_0)]" />
          </div>
          <figcaption className="mt-3 px-1 text-center">
            <span className="ink-legible text-[10px] uppercase tracking-[0.2em] text-accent">
              Cover
            </span>
            <time
              dateTime={photo.occurred_at}
              className="mt-0.5 block text-[11px] uppercase tracking-[0.18em] text-ink-muted"
            >
              {formatFullDate(photo.occurred_at)}
            </time>
          </figcaption>
        </div>
      </button>

      {/* Same treatment as `MemoryCard`'s remove control — always visible, a sibling of the "lift this print" button. */}
      <button
        type="button"
        aria-label={`Remove ${photo.title} from this album`}
        onClick={onRemove}
        className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-base leading-none text-ink-muted shadow-[0_4px_10px_-4px_rgba(76,59,48,0.5)] transition before:absolute before:-inset-1.5 before:content-[''] hover:scale-110 hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        ×
      </button>
    </motion.div>
  );
}

/**
 * The photos on a kept promise's own album page — the cover (`cover`,
 * possibly none yet) featured on its own above, everything else (`photos`)
 * rendered through the real `MemoryGrid` below, so an album photo gets the
 * exact same reactions/notes/kept-by/remove treatment a chapter print does
 * (see `MemoryGrid`'s `context` prop — this is its `"album"` case). The
 * cover uses the same `MemoryDetail` on click, bound with the same album
 * actions via `bindMemoryActions`, since it sits outside `MemoryGrid`'s own
 * list (featured, not a grid tile) but is otherwise an ordinary photo.
 */
export function PromiseAlbumGrid({
  itemId,
  cover,
  photos,
  reactionsByMemory,
  commentsByMemory,
  currentUserId,
}: {
  itemId: string;
  cover: MemoryWithMedia | null;
  photos: MemoryWithMedia[];
  reactionsByMemory: Record<string, Reaction[]>;
  commentsByMemory: Record<string, Comment[]>;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [coverOpen, setCoverOpen] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const [confirmingCoverRemoval, setConfirmingCoverRemoval] = useState(false);
  const [, startTransition] = useTransition();

  const actions = bindMemoryActions({ kind: "album", itemId });

  function confirmCoverRemoval() {
    if (!cover) return;
    setRemovingCover(true);
    startTransition(async () => {
      try {
        await actions.onRemove(cover.id);
        router.refresh();
      } finally {
        setRemovingCover(false);
        setConfirmingCoverRemoval(false);
      }
    });
  }

  if (!cover && photos.length === 0) {
    return (
      <p className="max-w-xl font-serif text-xl italic text-ink-muted">
        Nothing here yet — add the first photograph below.
      </p>
    );
  }

  return (
    <>
      {cover && (
        <CoverCard
          photo={cover}
          onSelect={() => setCoverOpen(true)}
          onRemove={() => setConfirmingCoverRemoval(true)}
        />
      )}

      {photos.length > 0 && (
        <MemoryGrid
          memories={photos}
          context={{ kind: "album", itemId }}
          reactionsByMemory={reactionsByMemory}
          commentsByMemory={commentsByMemory}
          currentUserId={currentUserId}
        />
      )}

      <AnimatePresence>
        {coverOpen && cover && (
          <MemoryDetail
            key={cover.id}
            memory={cover}
            reactions={reactionsByMemory[cover.id] ?? []}
            comments={commentsByMemory[cover.id] ?? []}
            currentUserId={currentUserId}
            onClose={() => setCoverOpen(false)}
            onEditCaption={(title) => actions.onEditCaption(cover.id, title)}
            onToggleResurface={(excluded) => actions.onToggleResurface(cover.id, excluded)}
            resolveFullUrl={() => actions.resolveFullUrl(cover.id)}
            onReact={(emoji) => actions.onReact(cover.id, emoji)}
            onUnreact={() => actions.onUnreact(cover.id)}
            onAddComment={(body) => actions.onAddComment(cover.id, body)}
            onEditComment={(commentId, body) => actions.onEditComment(commentId, body)}
            onRemoveComment={(commentId) => actions.onRemoveComment(commentId)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmingCoverRemoval && (
          <ConfirmDialog
            key="cover-removal"
            title="Take this one off the page?"
            body={actions.removalBody}
            confirmLabel="Take it off"
            busy={removingCover}
            onConfirm={confirmCoverRemoval}
            onCancel={() => !removingCover && setConfirmingCoverRemoval(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
