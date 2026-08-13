"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useCloseOnBack } from "@/lib/navigation/useCloseOnBack";
import { useSwipeNavigation } from "@/lib/navigation/useSwipeNavigation";
import { PhotoLightbox } from "./PhotoLightbox";
import type { Comment } from "@/lib/comments/types";
import { formatFullDate } from "@/lib/format/date";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import type { Reaction } from "@/lib/reactions/types";
import { MemoryComments } from "./MemoryComments";
import { MemoryReactions } from "./MemoryReactions";

/**
 * Context-agnostic — takes `onEditCaption`/`resolveFullUrl` plus the
 * reaction/comment callbacks rather than a `chapterId`/`chapterSlug` and
 * hardcoded chapter actions, so `MemoryGrid` can mount this for either a
 * chapter or a bucket-list album with the right Server Actions bound.
 */
export function MemoryDetail({
  memory,
  reactions,
  comments,
  currentUserId,
  onClose,
  onEditCaption,
  onToggleResurface,
  resolveFullUrl,
  onReact,
  onUnreact,
  onAddComment,
  onEditComment,
  onRemoveComment,
  onPrev,
  onNext,
}: {
  memory: MemoryWithMedia;
  reactions: Reaction[];
  comments: Comment[];
  currentUserId: string | null;
  onClose: () => void;
  onEditCaption: (title: string) => Promise<void>;
  /** The "keep this out of surprises" toggle — see `lib/surprises/`. */
  onToggleResurface: (excluded: boolean) => Promise<void>;
  resolveFullUrl: () => Promise<string | null>;
  onReact: (emoji: string) => Promise<void>;
  onUnreact: () => Promise<void>;
  onAddComment: (body: string) => Promise<void>;
  onEditComment: (commentId: string, body: string) => Promise<void>;
  onRemoveComment: (commentId: string) => Promise<void>;
  /**
   * Step to the neighbouring print on the same page without folding this one
   * first — absent at the ends of the batch (no wrap-around; an album page
   * has a first print and a last one) and absent entirely where there is no
   * batch (a promise's lone cover photo).
   */
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // This modal is only ever mounted while it's open (see MemoryGrid), so it
  // can claim a history entry for its whole lifetime — back closes it instead
  // of leaving the chapter page it was opened over.
  useCloseOnBack(onClose);

  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(memory.title);
  const [savingCaption, startCaptionTransition] = useTransition();

  function startEditCaption() {
    setCaptionDraft(memory.title);
    setEditingCaption(true);
  }

  function saveCaption() {
    const trimmed = captionDraft.trim();
    if (!trimmed) return;
    startCaptionTransition(async () => {
      await onEditCaption(trimmed);
      setEditingCaption(false);
      router.refresh();
    });
  }

  /**
   * The chapter page only signs thumbnails, so the full-size URL is fetched
   * when a print is actually lifted (see `resolveMemoryMedia`). Until it
   * arrives the thumbnail already in hand is shown in its place — it is the
   * same photograph, just softer, and it is on screen in the first frame. A
   * spinner or an empty mat here would be strictly worse: the reader opened
   * this print to look at it, and they can, immediately.
   *
   * `memory.mediaUrl` is still honoured if it happens to be set, so callers
   * that do resolve full URLs up front (the archive) need no special case.
   */
  const [fullUrl, setFullUrl] = useState<string | null>(memory.mediaUrl);
  const showing = fullUrl ?? memory.thumbnailUrl;

  useEffect(() => {
    if (fullUrl) return;
    let live = true;
    resolveFullUrl()
      .then((url) => {
        if (live && url) setFullUrl(url);
      })
      // A failure here leaves the thumbnail up, which is a legible photo and
      // not an error state worth interrupting anyone for.
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolveFullUrl is a fresh closure per render from the caller; re-running only when the memory or fullUrl itself changes is the intent
  }, [memory.id, fullUrl]);

  /** Tapping the print opens it full-screen — see `PhotoLightbox`. */
  const [zoomed, setZoomed] = useState(false);

  const [resurfacePending, setResurfacePending] = useState(false);
  function toggleResurface() {
    setResurfacePending(true);
    onToggleResurface(!memory.resurface_excluded)
      .then(() => router.refresh())
      .finally(() => setResurfacePending(false));
  }

  /**
   * Stepping to a neighbour (`onPrev`/`onNext`) swaps the `memory` prop on
   * this same mounted component rather than remounting it under a new key —
   * `useCloseOnBack` pushes a history entry per mount, and a keyed remount
   * per step would stack one entry for every print walked past, turning the
   * back button into a walk back through them. The cost of staying mounted is
   * resetting per-memory state by hand, done here with the render-time reset
   * pattern so the wrong memory's caption or full-size URL never paints.
   */
  const [shownMemoryId, setShownMemoryId] = useState(memory.id);
  if (shownMemoryId !== memory.id) {
    setShownMemoryId(memory.id);
    setFullUrl(memory.mediaUrl);
    setCaptionDraft(memory.title);
    setEditingCaption(false);
    setZoomed(false);
    // New per-item state joins this block — see the brain lesson on this
    // component's stable key + prev/next stepping (no remount to reset it
    // for free).
    setResurfacePending(false);
  }

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // One Escape, one layer. Without this the key would close the lightbox
        // and the memory underneath it in the same press, and the reader would
        // land back on the album page having only meant to stop zooming.
        if (zoomed) setZoomed(false);
        else onClose();
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      // Arrow keys belong to the caret while writing — a caption or a note —
      // and to nothing while the lightbox is up (stepping away would silently
      // close it, since the neighbour mounts un-zoomed).
      if (zoomed) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      if (event.key === "ArrowLeft") onPrev?.();
      else onNext?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, zoomed, onPrev, onNext]);

  // The same gesture the phone already answers with everywhere else — swiping
  // the lifted print slides its neighbour in. Judged on release, so it never
  // fights the modal's own vertical scroll.
  const swipe = useSwipeNavigation({ onPrev, onNext });

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
        {...swipe}
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: 0.34, ease: "easeOut" }}
      >
        {/* The way out sits at the top right, where a thing you close lives. */}
        <div className="mb-6 flex justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Fold this memory
          </button>
        </div>
        {showing && memory.type === "photo" && (
          /* Lifted off the album page: the print keeps its white mat, and the
             photo is contained rather than cropped — this is the one place
             she should see the whole frame as it was taken.

             Tapping it again opens it full-screen. That is the gesture people
             already have for "let me actually look at this", and the print is
             the obvious thing to aim it at, so it carries no instructions. */
          <div className="mb-6 rounded-2xl bg-[#fffdf7] p-3 shadow-[0_14px_30px_-20px_rgba(76,59,48,0.45)]">
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="See this photograph full screen"
              className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Image
                // Keyed on the URL so React swaps the element rather than
                // mutating `src` in place — the browser then paints the full
                // image only once it has decoded, instead of blanking the mat
                // while it loads.
                key={showing}
                src={showing}
                alt=""
                fill
                // A print you can pick up and drop somewhere is not a thing
                // anyone asked for; the gesture belongs to opening it.
                draggable={false}
                unoptimized
                sizes="(min-width: 640px) 640px, 92vw"
                className="object-contain transition duration-500 group-hover:scale-[1.01] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </button>
          </div>
        )}
        {editingCaption ? (
          <div>
            <input
              autoFocus
              type="text"
              value={captionDraft}
              disabled={savingCaption}
              onChange={(event) => setCaptionDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveCaption();
                if (event.key === "Escape") setEditingCaption(false);
              }}
              id="memory-detail-title"
              className="w-full border-b border-accent bg-transparent font-serif text-4xl leading-tight text-ink focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={saveCaption}
                disabled={savingCaption || captionDraft.trim().length === 0}
                className="text-[11px] uppercase tracking-[0.22em] text-accent disabled:opacity-60"
              >
                {savingCaption ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingCaption(false)}
                disabled={savingCaption}
                className="text-[11px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditCaption}
            aria-label="Edit this caption"
            className="group/caption block text-left focus-visible:outline-none"
          >
            <h2
              id="memory-detail-title"
              className="font-serif text-4xl leading-tight text-ink underline decoration-transparent decoration-2 underline-offset-4 transition group-hover/caption:decoration-border"
            >
              {memory.title}
            </h2>
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
          <time dateTime={memory.occurred_at}>{formatFullDate(memory.occurred_at)}</time>
          {/*
           * Who put this here. `created_by` is a bare `auth.users` id and there
           * is no column anywhere mapping one to "Joshua" or "Liezel" —
           * `relationship` stores the two names but nothing tying either to an
           * account — so this says only what it can actually know, exactly as
           * `MemoryComments` does for notes. Inventing a name would be worse
           * than not printing one. If real names are wanted, the missing piece
           * is a migration adding partner user ids to `relationship`.
           */}
          {memory.created_by && (
            <span>· Kept by {memory.created_by === currentUserId ? "you" : "your partner"}</span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleResurface}
          disabled={resurfacePending}
          className="mt-2 text-xs text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink disabled:opacity-60"
        >
          {memory.resurface_excluded
            ? "Let this resurface again someday"
            : "Keep this out of surprises"}
        </button>
        {memory.body && <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-ink">{memory.body}</p>}
        <MemoryReactions
          memoryId={memory.id}
          reactions={reactions}
          currentUserId={currentUserId}
          variant="inline"
          onReact={onReact}
          onUnreact={onUnreact}
        />
        <MemoryComments
          comments={comments}
          currentUserId={currentUserId}
          onAdd={onAddComment}
          onEdit={onEditComment}
          onRemove={onRemoveComment}
        />
      </motion.div>

      {/*
       * The neighbouring prints, one keystroke or click away — siblings of the
       * card so they rest on the backdrop at its edges rather than crowding
       * the mat. Hidden on touch screens, where the card itself answers to a
       * swipe and the edges are too narrow for a target anyway. Each stops
       * propagation: turning to the next print must not fold the book shut.
       */}
      {onPrev && (
        <button
          type="button"
          aria-label="Open the previous memory"
          onClick={(event) => {
            event.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 text-2xl leading-none text-ink-muted shadow-[0_10px_24px_-14px_rgba(43,36,28,0.7)] backdrop-blur-sm transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:flex"
        >
          ‹
        </button>
      )}
      {onNext && (
        <button
          type="button"
          aria-label="Open the next memory"
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 text-2xl leading-none text-ink-muted shadow-[0_10px_24px_-14px_rgba(43,36,28,0.7)] backdrop-blur-sm transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:flex"
        >
          ›
        </button>
      )}

      {/* Rendered inside the detail, so this modal stays mounted underneath and
          closing the lightbox returns to it exactly as it was left. */}
      <AnimatePresence>
        {zoomed && showing && (
          <PhotoLightbox src={showing} alt={memory.title} onClose={() => setZoomed(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
