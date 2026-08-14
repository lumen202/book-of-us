import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMonthDay, formatMonthYear, toLocalDate } from "@/lib/format/date";
import { getBucketItemCategories, listBucketItems } from "@/lib/bucket-list/queries";
import { getChapterBySlug } from "@/lib/chapters/queries";
import { getCommentsForMemories, groupCommentsByMemory } from "@/lib/comments/queries";
import { albumPrints, getChapterMemories, resolveMemoryMedia } from "@/lib/memories/queries";
import { pickComposerPrompt } from "@/lib/memories/prompts";
import { getAppNow } from "@/lib/relationship/devClock";
import { listTrips } from "@/lib/trips/queries";
import { getDaysUntil, getNextMonthsaryDate } from "@/lib/relationship/nextChapter";
import { getReactionsForMemories, groupReactionsByMemory } from "@/lib/reactions/queries";
import { createClient } from "@/lib/supabase/server";
import { MemoryGrid } from "@/components/memory/MemoryGrid";
import { MemoryComposer } from "@/components/memory/MemoryComposer";
import { ClosingReflection } from "@/components/story/ClosingReflection";
import { ExportChapterButton } from "@/components/chapter/ExportChapterButton";

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
  // A kept promise's cover leads the page regardless of its own occurred_at —
  // it's the one print here that's also a link to a whole album, so it reads
  // as this chapter's headline rather than getting lost wherever its date
  // happens to fall. `sort`'s stable, so within "is a cover" / "isn't" the
  // existing occurred_at order (oldest first, from get_chapter_memories) is
  // untouched — this only ever reorders across that boolean line.
  const memories = albumPrints(
    await resolveMemoryMedia(await getChapterMemories(chapter.id), { full: false }),
  ).sort((a, b) => (b.bucket_list_item_id ? 1 : 0) - (a.bucket_list_item_id ? 1 : 0));
  const memoryIds = memories.map((memory) => memory.id);
  const albumItemIds = Array.from(
    new Set(
      memories
        .map((memory) => memory.bucket_list_item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  // Reactions, notes, the viewer's identity, and which prints are actually a
  // kept promise's cover have nothing to do with each other; awaiting them in
  // sequence just stacked four round trips end to end in front of the first
  // paint.
  const [reactions, comments, auth, albumInfoByItemId, trips] = await Promise.all([
    getReactionsForMemories(memoryIds),
    getCommentsForMemories(memoryIds),
    createClient().then((supabase) => supabase.auth.getUser()),
    getBucketItemCategories(albumItemIds),
    listTrips(),
  ]);
  const reactionsByMemory = groupReactionsByMemory(reactions);
  const commentsByMemory = groupCommentsByMemory(comments);
  const user = auth.data.user;
  const now = getAppNow();
  const nextMonthsaryDate = getNextMonthsaryDate(now);

  /**
   * The composer's whispered prompt — see `lib/memories/prompts.ts`. Prefers
   * a line about a promise kept in the last two weeks (something concrete
   * and recent to write about) over the static bank, since "anything come
   * of it?" beats a generic prompt whenever there's a real answer to give.
   */
  const recentlyKept = (await listBucketItems())
    .filter((item) => item.status === "done" && item.completedAt)
    .sort((a, b) => (b.completedAt as string).localeCompare(a.completedAt as string))[0];
  const daysSinceKept = recentlyKept
    ? Math.round(
        (now.getTime() - toLocalDate(recentlyKept.completedAt as string).getTime()) / 86_400_000,
      )
    : null;
  const composerPrompt =
    daysSinceKept !== null && daysSinceKept >= 0 && daysSinceKept <= 14
      ? `It's been ${daysSinceKept === 0 ? "today" : daysSinceKept === 1 ? "a day" : `${daysSinceKept} days`} since you kept "${recentlyKept!.title}" — anything come of it?`
      : pickComposerPrompt(chapter.id, now);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
          >
            &larr; Back to the shelf
          </Link>
          {/* Only worth offering once there's something to export — the
              route itself refuses an empty chapter, but a dead-ending link
              is worse than no link. */}
          {memories.length > 0 && <ExportChapterButton chapterSlug={chapter.slug} />}
        </div>

        {/* The album's title page, before any prints */}
        <section className="flex max-w-2xl flex-col gap-3">
          <span className="ink-legible ink-legible-label text-[11px] uppercase tracking-[0.3em] text-accent">
            {formatMonthYear(chapter.month)}
          </span>
          <h1 className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">{chapter.title}</h1>
          <p className="ink-legible font-serif text-xl italic text-ink-muted">
            {memories.length === 0
              ? "Nothing on this page yet."
              : "Everything from this month, mounted one print at a time. Lift one to look closer."}
          </p>
        </section>

        <MemoryComposer
          chapterId={chapter.id}
          chapterSlug={chapter.slug}
          prompt={composerPrompt}
          trips={trips.map((trip) => ({ id: trip.id, title: trip.title }))}
        />

        <MemoryGrid
          memories={memories}
          context={{ kind: "chapter", chapterId: chapter.id, chapterSlug: chapter.slug }}
          reactionsByMemory={reactionsByMemory}
          commentsByMemory={commentsByMemory}
          currentUserId={user?.id ?? null}
          albumInfoByItemId={albumInfoByItemId}
        />
      </main>

      <ClosingReflection
        nextMonthsaryLabel={formatMonthDay(nextMonthsaryDate)}
        daysUntilNextMonthsary={getDaysUntil(nextMonthsaryDate, now)}
      />
    </>
  );
}
