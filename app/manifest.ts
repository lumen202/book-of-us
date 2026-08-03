import type { MetadataRoute } from "next";

/**
 * What Android's "Add to Home Screen" / "Install" reads to build the
 * shortcut — a browser tab favicon (`app/icon.tsx`) isn't enough for that,
 * which is why the installed icon wasn't showing the real mark before this
 * existed. `theme_color`/`background_color` match the app's own cream/ink
 * palette (`globals.css`'s `--color-surface`/`--color-ink`), and
 * `display: "standalone"` is what makes an installed shortcut open without
 * browser chrome, like a real app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Book of Us",
    short_name: "Book of Us",
    description: "A living record of us.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf7",
    theme_color: "#4c3b30",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
