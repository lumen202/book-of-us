import Link from "next/link";
import { notFound } from "next/navigation";
import { getBucketItem } from "@/lib/bucket-list/queries";
import {
  albumPrints,
  getBucketItemMemories,
  getMemoryChapterLinks,
  resolveMemoryMedia,
} from "@/lib/memories/queries";
import { AddAlbumPhotoComposer } from "@/components/bucket-list/AddAlbumPhotoComposer";
import { CategoryGlyph } from "@/components/bucket-list/CategoryGlyph";
import { PromiseAlbumGrid } from "@/components/bucket-list/PromiseAlbumGrid";

/**
 * A kept promise's own page: every photo tagged to it (the cover that also
 * lives in a chapter, plus anything added after), none of which clutter that
 * chapter's own grid — see `docs/agent/codebase-map/bucket-list.md`.
 */
export default async function BucketItemAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const chapterLink = item.memoryId
    ? (await getMemoryChapterLinks([item.memoryId]))[0] ?? null
    : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pb-24 pt-8">
      <Link
        href="/bucket-list"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the list
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

      <PromiseAlbumGrid itemId={item.id} cover={cover} photos={photos} />
    </main>
  );
}
