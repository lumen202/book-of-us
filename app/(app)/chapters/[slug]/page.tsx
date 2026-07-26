import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMonthYear } from "@/lib/format/date";
import { getChapterBySlug } from "@/lib/chapters/queries";
import { getChapterMemories, resolveMemoryMedia } from "@/lib/memories/queries";
import { MemoryGrid } from "@/components/memory/MemoryGrid";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const memories = await resolveMemoryMedia(await getChapterMemories(chapter.id));

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink">
        &larr; All chapters
      </Link>
      <div>
        <span className="text-xs uppercase tracking-wide text-accent">
          {formatMonthYear(chapter.month)}
        </span>
        <h1 className="font-serif text-3xl text-ink">{chapter.title}</h1>
      </div>
      <MemoryGrid memories={memories} />
    </main>
  );
}
