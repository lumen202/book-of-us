import Link from "next/link";
import { formatMonthYear } from "@/lib/format/date";
import type { Chapter } from "@/lib/chapters/types";

export function ChapterCover({ chapter }: { chapter: Chapter }) {
  return (
    <Link
      href={`/chapters/${chapter.slug}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-6 transition hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="text-xs uppercase tracking-wide text-accent">
        {formatMonthYear(chapter.month)}
      </span>
      <span className="font-serif text-2xl text-ink">{chapter.title}</span>
    </Link>
  );
}
