import Link from "next/link";
import { formatMonthYear } from "@/lib/format/date";
import type { Chapter } from "@/lib/chapters/types";

/**
 * One chapter, as a sheet of paper lying on the meadow.
 *
 * Deliberately carries no light of its own — see the "Paper, not glass" block
 * in globals.css for why the inner bevel and the top-right radial sheen that
 * used to be here were the two things making a hand-painted world look like a
 * dashboard. Elevation is a warm cast shadow and nothing else.
 *
 * The alternating tilt and the alternating cut (`.paper-card-alt`) do the same
 * job at two scales: no two sheets in the stack are placed *or* trimmed
 * identically, which is what a pile of real pages looks like.
 */
export function ChapterCover({ chapter, index = 0 }: { chapter: Chapter; index?: number }) {
  const alternate = index % 2 !== 0;
  const tiltClass = alternate ? "sm:rotate-[0.45deg]" : "sm:rotate-[-0.45deg]";
  const cutClass = alternate ? "paper-card-alt" : "";
  const monthLabel = formatMonthYear(chapter.month);
  const showMonthLabel = monthLabel !== chapter.title;

  return (
    <Link
      href={`/chapters/${chapter.slug}`}
      className={`scene-card paper-card group relative flex flex-col gap-3 border border-border/50 bg-surface/55 px-6 py-7 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface/72 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${cutClass} ${tiltClass}`}
    >
      {showMonthLabel && (
        <span className="label-quiet relative text-accent">{monthLabel}</span>
      )}
      <span className="relative font-serif text-3xl leading-tight text-ink">
        {chapter.title}
      </span>
      <span className="relative text-sm text-ink-muted transition group-hover:text-ink">
        Turn this page
      </span>
    </Link>
  );
}
