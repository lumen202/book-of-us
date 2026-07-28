"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * The photograph on its own, filling the screen.
 *
 * Opened by tapping the print inside `MemoryDetail`, which is the gesture
 * everyone already has for "let me actually look at this" — the detail view is
 * the memory (title, date, what was written, what was felt), and this is just
 * the picture, with everything else out of the way.
 *
 * ## Why this one is allowed to be dark
 *
 * The rest of the book refuses grey and refuses dark vignettes, because in the
 * painted world they read as dusk and as looking at something from outside it.
 * This is the exception and it is a deliberate one: a photograph shown against
 * anything warm picks up a colour cast, and the whole point of opening it this
 * far is to see the photo as it was taken. So the wash is `ink`, the book's own
 * darkest brown at high opacity, rather than black — dark enough to disappear,
 * still not a colour from outside this world.
 *
 * It also exits as easily as it opens: tap anywhere, or Escape. Nothing here is
 * a destination, so nothing here needs a way back that has to be found.
 */
export function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Photograph, full screen"}
      // z-50: above the detail modal (z-40) it was opened from, which stays
      // mounted underneath so closing this returns to it exactly as it was.
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4"
      // Stopped, not just handled: this renders *inside* the detail modal it
      // was opened from, whose own backdrop closes on click. Without this, one
      // tap would close the photo and the memory behind it together, and the
      // reader would be back on the album page having only meant to stop
      // looking closely.
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <motion.div
        className="relative h-full w-full"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          draggable={false}
          unoptimized
          sizes="100vw"
          className="object-contain"
          // The one image in the app that should arrive as fast as it can —
          // the reader is looking at nothing else.
          priority
        />
      </motion.div>

      {/*
       * Last in the DOM so it paints over the photo, and it does not stop
       * propagation — tapping it closes via the backdrop handler like every
       * other tap. It exists to be *visible* and focusable, not to be the only
       * way out.
       */}
      <button
        ref={closeButtonRef}
        type="button"
        aria-label="Close the photograph"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/15 text-2xl leading-none text-surface backdrop-blur-sm transition hover:bg-surface/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-surface"
      >
        ×
      </button>
    </motion.div>
  );
}
