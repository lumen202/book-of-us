import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMonthDay, formatMonthYear } from "@/lib/format/date";
import { getChapterBySlug } from "@/lib/chapters/queries";
import { getCommentsForMemories, groupCommentsByMemory } from "@/lib/comments/queries";
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

  // `full: false` — the grid shows thumbnails, and the full-size URL for a
  // print is signed when that print is lifted (see `getMemoryFullUrl`). Signing
  // both here cost one extra Storage round trip per photo on every page open,
  // for a URL most prints never use and which expires in five minutes anyway.
  const memories = albumPrints(
    await resolveMemoryMedia(await getChapterMemories(chapter.id), { full: false }),
  );
  const memoryIds = memories.map((memory) => memory.id);

  // Reactions, notes and the viewer's identity have nothing to do with each
  // other; awaiting them in sequence just stacked three round trips end to end
  // in front of the first paint.
  const [reactions, comments, auth] = await Promise.all([
    getReactionsForMemories(memoryIds),
    getCommentsForMemories(memoryIds),
    createClient().then((supabase) => supabase.auth.getUser()),
  ]);
  const reactionsByMemory = groupReactionsByMemory(reactions);
  const commentsByMemory = groupCommentsByMemory(comments);
  const user = auth.data.user;
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
          chapterId={chapter.id}
          chapterSlug={chapter.slug}
          reactionsByMemory={reactionsByMemory}
          commentsByMemory={commentsByMemory}
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
