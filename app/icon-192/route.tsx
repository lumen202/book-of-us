import { ImageResponse } from "next/og";
import { renderBookGlyph } from "@/lib/icon/bookGlyph";

/**
 * A plain Route Handler, not the `icon.tsx` convention — that one's reserved
 * for the browser-tab favicon at a fixed size. This is one of the two sizes
 * `app/manifest.ts` points Android's "Add to Home Screen" at; without a
 * manifest declaring these, Android had nothing but the 32px favicon to
 * upscale (or a generic fallback), which is why the installed shortcut
 * wasn't showing the real mark.
 */
export async function GET() {
  return new ImageResponse(renderBookGlyph(192), { width: 192, height: 192 });
}
