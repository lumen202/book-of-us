/**
 * The book-cover-with-a-heart mark, shared by every icon size this app
 * serves (`app/icon.tsx`'s 32px browser favicon, `app/apple-icon.tsx`'s
 * 180px iOS home-screen icon, and the Android manifest sizes in
 * `app/manifest.ts`) — one set of proportions, scaled, so a future palette
 * or shape change only happens in one place.
 *
 * `maskable` adds extra padding around the glyph: Android can crop a
 * maskable icon to a circle, squircle, or rounded square depending on the
 * launcher, and content outside the safe zone (the center ~80%) gets clipped.
 * The non-maskable sizes (browser tab, iOS) don't need the extra margin.
 */
export function renderBookGlyph(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const padding = maskable ? size * 0.2 : 0;
  const contentSize = size - padding * 2;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#4c3b30",
        borderRadius: maskable ? 0 : Math.round(size * 0.22),
      }}
    >
      <div
        style={{
          width: Math.round(contentSize * 0.625),
          height: Math.round(contentSize * 0.75),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffdf7",
          borderRadius: `${Math.max(1, Math.round(contentSize * 0.03))}px ${Math.round(contentSize * 0.09)}px ${Math.round(contentSize * 0.09)}px ${Math.max(1, Math.round(contentSize * 0.03))}px`,
          borderLeft: `${Math.max(2, Math.round(contentSize * 0.06))}px solid #e7d5bb`,
        }}
      >
        <span style={{ fontSize: Math.round(contentSize * 0.34), lineHeight: 1, color: "#e8a06b" }}>
          ♥
        </span>
      </div>
    </div>
  );
}
