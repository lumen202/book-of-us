import { ImageResponse } from "next/og";
import { renderBookGlyph } from "@/lib/icon/bookGlyph";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * A small book cover (spine on the left, a heart where a title would sit) in
 * the site's own ink/cream/warm palette (`globals.css`'s `--color-ink`,
 * `--color-surface`, `--color-accent-warm`) rather than the default Next.js
 * starter favicon. Kept as plain shapes, not the illustrated painted-world
 * style — a favicon is read at 16-32px, where brushwork and gradients wash
 * out to noise; a book and a heart are what still reads at that size.
 *
 * See `app/apple-icon.tsx` and `app/manifest.ts` for the larger sizes this
 * same mark scales up to for home-screen installs.
 */
export default function Icon() {
  return new ImageResponse(renderBookGlyph(32), { ...size });
}
