import Link from "next/link";
import { notFound } from "next/navigation";
import { getBucketItem } from "@/lib/bucket-list/queries";
import { getCommentsForMemories, groupCommentsByMemory } from "@/lib/comments/queries";
import {
  albumPrints,
  getBucketItemMemories,
  getMemoryChapterLinks,
  resolveMemoryMedia,
} from "@/lib/memories/queries";
import { getReactionsForMemories, groupReactionsByMemory } from "@/lib/reactions/queries";
import { createClient } from "@/lib/supabase/server";
import { AddAlbumPhotoComposer } from "@/components/bucket-list/AddAlbumPhotoComposer";
import { CategoryGlyph } from "@/components/bucket-list/CategoryGlyph";
import { PromiseAlbumGrid } from "@/components/bucket-list/PromiseAlbumGrid";

/** Only ever a same-app path this page actually recognizes — never trust `from` blindly as an href. */
function resolveBackLink(from: string | undefined): { href: string; label: string } {
  if (from && from.startsWith("/chapters/")) return { href: from, label: "Back to the chapter" };
  return { href: "/bucket-list", label: "Back to the list" };
}

/**
 * A kept promise's own page: every photo tagged to it (the cover that also
 * lives in a chapter, plus anything added after), none of which clutter that
 * chapter's own grid — see `docs/agent/codebase-map/bucket-list.md`.
 */
export default async function BucketItemAlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const item = await getBucketItem(id);
  if (!item) notFound();

  // Thumbnails only, same reasoning as the chapter page — the full-size URL
  // is signed on demand when a print is actually lifted.
  const allPhotos = albumPrints(
    await resolveMemoryMedia(await getBucketItemMemories(item.id), { full: false }),
  );
  // The featured photo (`cover_memory_id`) is shown on its own, not a second
  // time in the grid below — see `PromiseAlbumGrid`.
  const cover = item.coverMemoryId
    ? (allPhotos.find((photo) => photo.id === item.coverMemoryId) ?? null)
    : null;
  const photos = cover ? allPhotos.filter((photo) => photo.id !== cover.id) : allPhotos;
  const photoIds = allPhotos.map((photo) => photo.id);

  const [chapterLinks, reactions, comments, auth] = await Promise.all([
    item.memoryId ? getMemoryChapterLinks([item.memoryId]) : Promise.resolve([]),
    getReactionsForMemories(photoIds),
    getCommentsForMemories(photoIds),
    createClient().then((supabase) => supabase.auth.getUser()),
  ]);
  const chapterLink = chapterLinks[0] ?? null;
  const reactionsByMemory = groupReactionsByMemory(reactions);
  const commentsByMemory = groupCommentsByMemory(comments);
  const currentUserId = auth.data.user?.id ?? null;

  const backLink = resolveBackLink(from);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pb-24 pt-8">
      <Link
        href={backLink.href}
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; {backLink.label}
      </Link>

      <section className="flex max-w-2xl flex-col gap-3">
        {/* The glyph is the same mark the bucket list row shows for this
            promise's category — a visible thread back to "this album came
            from a promise," not just the eyebrow text alone. */}
        <span className="ink-legible flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-accent">
          <CategoryGlyph category={item.category} className="h-4 w-4 shrink-0" />
          {item.status === "done" ? "A promise, kept" : "A promise, still open"}
        </span>
        <h1 className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">
          {item.title}
        </h1>
        {item.note && (
          <p className="ink-legible font-serif text-xl italic text-ink-muted">{item.note}</p>
        )}
        {chapterLink && (
          <Link
            href={`/chapters/${chapterLink.chapterSlug}`}
            className="ink-legible w-fit text-[11px] uppercase tracking-[0.2em] text-accent underline decoration-border underline-offset-4 transition hover:text-ink"
          >
            see the cover print in {chapterLink.chapterTitle}
          </Link>
        )}
      </section>

      <AddAlbumPhotoComposer itemId={item.id} />

      <PromiseAlbumGrid
        itemId={item.id}
        cover={cover}
        photos={photos}
        reactionsByMemory={reactionsByMemory}
        commentsByMemory={commentsByMemory}
        currentUserId={currentUserId}
      />
    </main>
  );
}
