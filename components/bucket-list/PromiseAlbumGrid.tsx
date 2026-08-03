"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { loadPromiseAlbumFullUrl } from "@/app/(app)/bucket-list/actions";
import { formatFullDate } from "@/lib/format/date";
import type { MemoryWithMedia } from "@/lib/memories/queries";
import { PhotoLightbox } from "@/components/memory/PhotoLightbox";

/** Same deterministic-by-position tilt as `MemoryCard`, for the same reason. */
const TILTS = [-1.5, 1, -0.7, 1.4, -1.1, 0.6];

/** A photo corner mount — matches `MemoryCard`'s, for visual continuity with the chapter pages. */
function Corner({ className }: { className: string }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute h-5 w-5 bg-ink/15 ${className}`} />
  );
}

/**
 * Mounted fresh per selected photo (`key={photo.id}` below) rather than
 * living in the parent's own state — so `fullUrl` initializing from
 * `photo.mediaUrl` and then being resolved on demand needs no reset-on-change
 * effect, the same reason `MemoryDetail` is keyed per memory in `MemoryGrid`.
 */
function AlbumLightbox({
  itemId,
  photo,
  onClose,
}: {
  itemId: string;
  photo: MemoryWithMedia;
  onClose: () => void;
}) {
  const [fullUrl, setFullUrl] = useState<string | null>(photo.mediaUrl);

  useEffect(() => {
    if (fullUrl) return;
    let live = true;
    loadPromiseAlbumFullUrl(itemId, photo.id)
      .then((url) => {
        if (live && url) setFullUrl(url);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [itemId, photo.id, fullUrl]);

  return (
    <PhotoLightbox src={fullUrl ?? photo.thumbnailUrl ?? ""} alt={photo.title} onClose={onClose} />
  );
}

/** The featured cover — bigger than a grid tile, centered, resting flat (no tilt, it's the title page, not a loose print). */
function CoverCard({ photo, onSelect }: { photo: MemoryWithMedia; onSelect: () => void }) {
  const imageUrl = photo.thumbnailUrl ?? photo.mediaUrl;
  if (!imageUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="mx-auto w-full max-w-xs"
    >
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={(event) => event.preventDefault()}
        className="group block w-full select-none text-left [-webkit-touch-callout:none] focus-visible:outline-none"
      >
        <div className="relative rounded-2xl bg-[#fffdf7] p-3 pb-4 shadow-[0_20px_36px_-18px_rgba(76,59,48,0.5)] transition duration-700 group-hover:shadow-[0_26px_44px_-18px_rgba(76,59,48,0.55)] group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-accent motion-reduce:transition-none">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink/5">
            <Image
              src={imageUrl}
              alt=""
              fill
              draggable={false}
              unoptimized
              sizes="320px"
              className="object-cover transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <Corner className="left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]" />
            <Corner className="right-0 top-0 [clip-path:polygon(100%_0,100%_100%,0_0)]" />
            <Corner className="bottom-0 left-0 [clip-path:polygon(0_100%,0_0,100%_100%)]" />
            <Corner className="bottom-0 right-0 [clip-path:polygon(100%_100%,0_100%,100%_0)]" />
          </div>
          <figcaption className="mt-3 px-1 text-center">
            <time
              dateTime={photo.occurred_at}
              className="block text-[11px] uppercase tracking-[0.18em] text-ink-muted"
            >
              {formatFullDate(photo.occurred_at)}
            </time>
          </figcaption>
        </div>
      </button>
    </motion.div>
  );
}

/**
 * The photos on a kept promise's own album page — the cover (`cover`,
 * possibly none yet) featured on its own above, everything else (`photos`)
 * in the grid below. A trimmed sibling of `MemoryGrid`/`MemoryCard` — same
 * corner-mount/tilt look and the same `PhotoLightbox` on tap, but no
 * reactions, no comments, no press-and-hold, no remove control. This page
 * is view-and-add only for now; removing a photo from an album isn't in
 * scope yet (see `docs/agent/codebase-map/bucket-list.md`) and can reuse
 * the existing `softDeleteMemory` mutation later with no new backend work.
 */
export function PromiseAlbumGrid({
  itemId,
  cover,
  photos,
}: {
  itemId: string;
  cover: MemoryWithMedia | null;
  photos: MemoryWithMedia[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const all = cover ? [cover, ...photos] : photos;
  const selected = all.find((photo) => photo.id === selectedId) ?? null;

  if (!cover && photos.length === 0) {
    return (
      <p className="max-w-xl font-serif text-xl italic text-ink-muted">
        Nothing here yet — add the first photograph below.
      </p>
    );
  }

  return (
    <>
      {cover && <CoverCard photo={cover} onSelect={() => setSelectedId(cover.id)} />}

      {photos.length > 0 && (
        <div className="relative rounded-[2rem] bg-surface/75 px-5 py-8 shadow-[0_30px_60px_-45px_rgba(43,23,29,0.75)] sm:px-10 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-[0.5]"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 60%)",
            }}
          />

          <div className="relative grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, index) => {
              const imageUrl = photo.thumbnailUrl ?? photo.mediaUrl;
              if (!imageUrl) return null;
              const tilt = TILTS[index % TILTS.length];

              return (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.9, delay: Math.min(index, 5) * 0.09, ease: "easeOut" }}
                  style={{ rotate: `${tilt}deg` }}
                  className="group relative transition duration-500 ease-(--ease-bounce) hover:-translate-y-2 hover:scale-[1.02] hover:[rotate:0deg] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(photo.id)}
                    onContextMenu={(event) => event.preventDefault()}
                    className="block w-full select-none text-left [-webkit-touch-callout:none] focus-visible:outline-none"
                  >
                    <div className="relative rounded-2xl bg-[#fffdf7] p-3 pb-4 shadow-[0_12px_24px_-14px_rgba(76,59,48,0.42)] transition duration-700 group-hover:shadow-[0_24px_38px_-18px_rgba(76,59,48,0.45)] group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-accent motion-reduce:transition-none">
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink/5">
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          draggable={false}
                          unoptimized
                          loading="lazy"
                          sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
                          className="object-cover transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                        <Corner className="left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]" />
                        <Corner className="right-0 top-0 [clip-path:polygon(100%_0,100%_100%,0_0)]" />
                        <Corner className="bottom-0 left-0 [clip-path:polygon(0_100%,0_0,100%_100%)]" />
                        <Corner className="bottom-0 right-0 [clip-path:polygon(100%_100%,0_100%,100%_0)]" />
                      </div>

                      <figcaption className="mt-3 px-1">
                        {photo.title !== formatFullDate(photo.occurred_at) && (
                          <span className="block font-serif text-xl italic leading-tight text-ink">
                            {photo.title}
                          </span>
                        )}
                        <time
                          dateTime={photo.occurred_at}
                          className="mt-1 block text-[11px] uppercase tracking-[0.18em] text-ink-muted"
                        >
                          {formatFullDate(photo.occurred_at)}
                        </time>
                      </figcaption>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <AlbumLightbox
          key={selected.id}
          itemId={itemId}
          photo={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
