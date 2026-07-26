import Link from "next/link";
import { formatMonthYear } from "@/lib/format/date";
import type { Chapter } from "@/lib/chapters/types";

export function ChapterCover({ chapter, index = 0 }: { chapter: Chapter; index?: number }) {
  const tiltClass = index % 2 === 0 ? "sm:rotate-[-0.45deg]" : "sm:rotate-[0.45deg]";

  return (
    <Link
      href={`/chapters/${chapter.slug}`}
      className={`group relative flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface/90 px-6 py-7 shadow-[0_14px_34px_-26px_rgba(43,36,28,0.45)] transition duration-500 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_18px_40px_-24px_rgba(43,36,28,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${tiltClass}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-accent)_38%,transparent),transparent_44%)] opacity-48"
      />
      <span className="relative text-[11px] uppercase tracking-[0.26em] text-accent">
        {formatMonthYear(chapter.month)}
      </span>
      <span className="relative font-serif text-3xl leading-tight text-ink">{chapter.title}</span>
      <span className="relative text-sm text-ink-muted transition group-hover:text-ink">
        Turn this page
      </span>
    </Link>
  );
}
