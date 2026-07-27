"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Comment } from "@/lib/comments/types";
import { formatFullDate } from "@/lib/format/date";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import type { Reaction } from "@/lib/reactions/types";
import { MemoryComments } from "./MemoryComments";
import { MemoryReactions } from "./MemoryReactions";

export function MemoryDetail({
  memory,
  chapterSlug,
  reactions,
  comments,
  currentUserId,
  onClose,
}: {
  memory: MemoryWithMedia;
  chapterSlug: string;
  reactions: Reaction[];
  comments: Comment[];
  currentUserId: string | null;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-detail-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <motion.div
        // `dvh`, not `vh`: this modal's own textarea (in MemoryComments,
        // rendered below) needs its cap to actually shrink when the on-screen
        // keyboard opens — `vh` is the layout viewport and doesn't track
        // that, which is how a note field ends up hidden behind the keyboard
        // with no way to scroll to it.
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-border/90 bg-surface/97 p-6 shadow-[0_24px_50px_-30px_rgba(43,36,28,0.8)] sm:p-8"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: 0.34, ease: "easeOut" }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="mb-6 text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Fold this memory
        </button>
        {memory.mediaUrl && memory.type === "photo" && (
          /* Lifted off the album page: the print keeps its white mat, and the
             photo is contained rather than cropped — this is the one place
             she should see the whole frame as it was taken. */
          <div className="mb-6 rounded-2xl bg-[#fffdf7] p-3 shadow-[0_14px_30px_-20px_rgba(76,59,48,0.45)]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-ink/5">
              <Image
                src={memory.mediaUrl}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 640px) 640px, 92vw"
                className="object-contain"
              />
            </div>
          </div>
        )}
        <h2 id="memory-detail-title" className="font-serif text-4xl leading-tight text-ink">
          {memory.title}
        </h2>
        <time dateTime={memory.occurred_at} className="mt-1 block text-sm text-ink-muted">
          {formatFullDate(memory.occurred_at)}
        </time>
        {memory.body && <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-ink">{memory.body}</p>}
        <MemoryReactions
          memoryId={memory.id}
          chapterSlug={chapterSlug}
          reactions={reactions}
          currentUserId={currentUserId}
          variant="inline"
        />
        <MemoryComments
          memoryId={memory.id}
          chapterSlug={chapterSlug}
          comments={comments}
          currentUserId={currentUserId}
        />
      </motion.div>
    </motion.div>
  );
}
