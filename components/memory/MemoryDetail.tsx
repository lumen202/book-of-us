"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { formatFullDate } from "@/lib/format/date";
import type { MemoryWithMedia } from "@/lib/memories/queries";

export function MemoryDetail({
  memory,
  onClose,
}: {
  memory: MemoryWithMedia;
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-detail-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="mb-4 text-sm text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Close
        </button>
        {memory.mediaUrl && memory.type === "photo" && (
          <div className="relative mb-4 h-64 w-full overflow-hidden rounded">
            <Image src={memory.mediaUrl} alt="" fill unoptimized className="object-cover" />
          </div>
        )}
        <h2 id="memory-detail-title" className="font-serif text-2xl text-ink">
          {memory.title}
        </h2>
        <time dateTime={memory.occurred_at} className="mt-1 block text-sm text-ink-muted">
          {formatFullDate(memory.occurred_at)}
        </time>
        {memory.body && <p className="mt-4 whitespace-pre-wrap text-ink">{memory.body}</p>}
      </div>
    </div>
  );
}
