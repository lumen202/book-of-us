"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { markSurpriseShown } from "@/app/(app)/actions";
import { formatFullDate } from "@/lib/format/date";
import type { Memory } from "@/lib/memories/types";

/**
 * One loose photograph resting above the shelf — "this slipped out of the
 * book," never a widget. Distinct from `MemoryCard` on purpose: a single
 * print, off to one side, not part of a grid — the whole point is that it
 * doesn't belong in the day's layout, it just showed up.
 *
 * `app/(app)/page.tsx` decides *whether* this renders (~1 visit in 3,
 * skipped on Celebration days). This component's only job once mounted is to
 * record that the pick was actually shown, so `lib/surprises/pick.ts`'s
 * cooldown has something to steer away from next time.
 */
export function SurprisePrint({
  memory,
  chapterSlug,
  thumbnailUrl,
}: {
  memory: Memory;
  chapterSlug: string | null;
  thumbnailUrl: string | null;
}) {
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    markSurpriseShown(memory.id).catch(() => {});
    // Only ever once per mount — a re-render (e.g. from an unrelated router
    // refresh elsewhere on the page) must not record the same shown-ness twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = (
    <div
      style={{ rotate: "-2.5deg" }}
      className="group relative w-40 shrink-0 transition duration-500 ease-(--ease-bounce) hover:-translate-y-1 hover:[rotate:0deg] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-48"
    >
      <div className="rounded-2xl bg-[#fffdf7] p-2.5 pb-3.5 shadow-[0_14px_26px_-16px_rgba(76,59,48,0.5)] transition duration-700 group-hover:shadow-[0_22px_36px_-18px_rgba(76,59,48,0.52)]">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-ink/5">
          {thumbnailUrl && (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              unoptimized
              sizes="192px"
              className="object-cover"
            />
          )}
        </div>
        <p className="mt-2 truncate px-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {formatFullDate(memory.occurred_at)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-6">
      <span className="ink-legible text-[11px] uppercase tracking-[0.28em] text-accent">
        This slipped out of the book
      </span>
      {chapterSlug ? (
        <Link href={`/chapters/${chapterSlug}`} aria-label={`Open "${memory.title}"`}>
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}
