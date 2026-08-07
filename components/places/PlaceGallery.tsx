"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { PhotoLightbox } from "@/components/memory/PhotoLightbox";
import type { PlaceImage } from "@/lib/places/types";
import { PlaceImageFrame } from "./PlaceImageFrame";

/** A row of thumbnails opening the same full-screen lightbox the album pages use. */
export function PlaceGallery({ images }: { images: readonly PlaceImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2">
        {images.map((image, index) => (
          <button
            key={image.file}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="shrink-0 snap-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <PlaceImageFrame
              image={image}
              sizes="208px"
              className="aspect-[4/3] w-40 rounded-xl border border-border shadow-[0_8px_18px_-12px_rgba(76,59,48,0.4)] transition hover:-translate-y-0.5 sm:w-52"
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <PhotoLightbox
            src={images[openIndex].url}
            alt={images[openIndex].alt}
            onClose={() => setOpenIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
