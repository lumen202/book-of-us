"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addComment, editMemoryComment, removeMemoryComment } from "@/app/(app)/chapters/[slug]/actions";
import type { Comment } from "@/lib/comments/types";

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/**
 * Notes left in the margin of a print — freeform text, unlike the
 * fixed-vocabulary reactions in `MemoryReactions.tsx`. Lives only in the
 * lifted detail view: a note is a sentence, not a sticker, and needs the room
 * the detail view has that a grid print doesn't.
 *
 * Attribution is "You" / "Your partner" rather than a name — this book has
 * exactly two accounts and no reliable mapping from account to display name
 * (the relationship's two partner names aren't tied to a specific auth user
 * anywhere in the schema), so guessing a name would be more likely to be
 * wrong than useful. Whether a note is yours is the one thing this component
 * *can* know for certain, from `currentUserId`, and that's also the thing
 * that decides whether the remove control shows.
 */
export function MemoryComments({
  memoryId,
  chapterSlug,
  comments,
  currentUserId,
}: {
  memoryId: string;
  chapterSlug: string;
  comments: Comment[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      await addComment(memoryId, body, chapterSlug);
      setDraft("");
      router.refresh();
    });
  }

  function remove(commentId: string) {
    startTransition(async () => {
      await removeMemoryComment(commentId, chapterSlug);
      router.refresh();
    });
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditDraft(comment.body);
  }

  function saveEdit(commentId: string) {
    const body = editDraft.trim();
    if (!body) return;
    startTransition(async () => {
      await editMemoryComment(commentId, body, chapterSlug);
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      {comments.length > 0 && (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => {
            const mine = comment.userId === currentUserId;
            const editing = editingId === comment.id;

            if (editing) {
              return (
                <li key={comment.id}>
                  <textarea
                    autoFocus
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    disabled={pending}
                    rows={2}
                    className="block w-full resize-none border-b border-accent bg-transparent py-1.5 font-serif text-lg text-ink focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => saveEdit(comment.id)}
                      disabled={pending || editDraft.trim().length === 0}
                      className="text-[11px] uppercase tracking-[0.22em] text-accent disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={pending}
                      className="text-[11px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              );
            }

            return (
              <li key={comment.id} className="group flex items-start justify-between gap-3">
                <p className="font-serif text-lg italic leading-snug text-ink">
                  {comment.body}
                  <span className="ml-2 font-sans text-[11px] not-italic uppercase tracking-[0.18em] text-ink-muted">
                    {mine ? "You" : "Your partner"} · {formatNoteDate(comment.createdAt)}
                  </span>
                </p>
                {mine && (
                  <span className="flex shrink-0 items-center gap-3 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startEdit(comment)}
                      aria-label="Edit this note"
                      className="text-xs text-ink-muted transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(comment.id)}
                      aria-label="Remove this note"
                      className="text-xs text-ink-muted transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      Remove
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className={comments.length > 0 ? "mt-5" : undefined}>
        <label className="block text-[11px] uppercase tracking-[0.22em] text-ink-muted">
          Leave a note
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => {
              // Belt-and-suspenders alongside MemoryDetail's `dvh` cap: the
              // on-screen keyboard's opening animation takes a moment, so a
              // scroll issued the instant focus fires can still land short —
              // this waits it out, then scrolls within the modal's own
              // scroll container (`block: "nearest"`, not "center"/"start",
              // so it doesn't yank already-visible content around).
              const field = event.currentTarget;
              window.setTimeout(() => field.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
            }}
            disabled={pending}
            rows={2}
            placeholder="Write something in the margin"
            className="mt-2 block w-full resize-none border-b border-border bg-transparent py-1.5 font-serif text-lg normal-case tracking-normal text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={pending || draft.trim().length === 0}
          className="mt-3 rounded-full bg-accent px-5 py-2 text-[11px] uppercase tracking-[0.24em] text-surface shadow-[0_8px_16px_-8px_rgba(76,59,48,0.5)] transition hover:scale-[1.03] hover:brightness-95 disabled:opacity-50 motion-reduce:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {pending ? "Tucking it in…" : "Leave it here"}
        </button>
      </div>
    </div>
  );
}
