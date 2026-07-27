import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMonthDay, formatMonthYear } from "@/lib/format/date";
import { getChapterBySlug } from "@/lib/chapters/queries";
import { albumPrints, getChapterMemories, resolveMemoryMedia } from "@/lib/memories/queries";
import { getAppNow } from "@/lib/relationship/devClock";
import { getDaysUntil, getNextChapterDate } from "@/lib/relationship/nextChapter";
import { getReactionsForMemories, groupReactionsByMemory } from "@/lib/reactions/queries";
import { createClient } from "@/lib/supabase/server";
import { MemoryGrid } from "@/components/memory/MemoryGrid";
import { MemoryComposer } from "@/components/memory/MemoryComposer";
import { ClosingReflection } from "@/components/story/ClosingReflection";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const memories = albumPrints(await resolveMemoryMedia(await getChapterMemories(chapter.id)));
  const reactionsByMemory = groupReactionsByMemory(
    await getReactionsForMemories(memories.map((memory) => memory.id)),
  );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const now = getAppNow();
  const nextChapterDate = getNextChapterDate(now);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pt-8">
        <Link
          href="/"
          className="w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
        >
          &larr; Back to the shelf
        </Link>

        {/* The album's title page, before any prints */}
        <section className="flex max-w-2xl flex-col gap-3">
          <span className="text-[11px] uppercase tracking-[0.3em] text-accent">
            {formatMonthYear(chapter.month)}
          </span>
          <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">{chapter.title}</h1>
          <p className="font-serif text-xl italic text-ink-muted">
            {memories.length === 0
              ? "Nothing on this page yet."
              : "Everything from this month, mounted one print at a time. Lift one to look closer."}
          </p>
        </section>

        <MemoryComposer chapterId={chapter.id} chapterSlug={chapter.slug} />

        <MemoryGrid
          memories={memories}
          chapterSlug={chapter.slug}
          reactionsByMemory={reactionsByMemory}
          currentUserId={user?.id ?? null}
        />
      </main>

      <ClosingReflection
        nextChapterLabel={formatMonthDay(nextChapterDate)}
        daysUntilNextChapter={getDaysUntil(nextChapterDate, now)}
      />
    </>
  );
}
