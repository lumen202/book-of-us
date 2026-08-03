import { ImageResponse } from "next/og";
import { renderBookGlyph } from "@/lib/icon/bookGlyph";

/**
 * The maskable size — extra padding baked into `renderBookGlyph`'s
 * `maskable` option, since Android may crop this to a circle/squircle/rounded
 * square depending on the launcher and anything outside the safe zone gets
 * clipped. Declared in `app/manifest.ts` with `purpose: "maskable"`.
 */
export async function GET() {
  return new ImageResponse(renderBookGlyph(512, { maskable: true }), { width: 512, height: 512 });
}
