import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * A small book cover (spine on the left, a heart where a title would sit) in
 * the site's own ink/cream/warm palette (`globals.css`'s `--color-ink`,
 * `--color-surface`, `--color-accent-warm`) rather than the default Next.js
 * starter favicon. Kept as plain shapes, not the illustrated painted-world
 * style — a favicon is read at 16-32px, where brushwork and gradients wash
 * out to noise; a book and a heart are what still reads at that size.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4c3b30",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 20,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fffdf7",
            borderRadius: "1px 3px 3px 1px",
            borderLeft: "2px solid #e7d5bb",
          }}
        >
          <span style={{ fontSize: 11, lineHeight: 1, color: "#e8a06b" }}>♥</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
