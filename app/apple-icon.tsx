import { ImageResponse } from "next/og";
import { renderBookGlyph } from "@/lib/icon/bookGlyph";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS's own home-screen icon convention — Next serves this at the path Apple looks for automatically, no manifest entry needed. Same mark as `app/icon.tsx`, just bigger. */
export default function AppleIcon() {
  return new ImageResponse(renderBookGlyph(180), { ...size });
}
