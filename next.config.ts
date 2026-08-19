import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Places' atlas images (lib/places/data/atlas.generated.json) are
    // Wikimedia Commons thumbnail URLs — see scripts/build-places.ts. No
    // other remote host is ever used for an <Image>; everything else in the
    // app is a signed Supabase Storage URL, generated server-side per
    // request rather than known at config time.
    remotePatterns: [new URL("https://upload.wikimedia.org/**")],
  },

  async headers() {
    return [
      {
        // `sw.js` is re-fetched by the browser on its own schedule to check for
        // a new worker. If that fetch can be answered from the HTTP cache, a
        // shipped fix to `public/sw.js` sits unapplied on devices for up to a
        // day — the failure mode being that the thing responsible for updating
        // the app is itself the stalest file in it. `updateViaCache: "none"` in
        // `ServiceWorkerRegistrar` is the client-side half of this.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        // Digital Asset Links — how Google verifies the Android app and this
        // origin belong to the same owner. Fetched by Google's crawler with no
        // session and no browser; if it 307s (see the note in `proxy.ts`) or
        // comes back as anything other than JSON, verification fails silently
        // and the installed app degrades to showing a browser address bar.
        source: "/.well-known/assetlinks.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing in this app is ever meant to be framed. The OpenStreetMap
          // embed in `lib/places/maps.ts` is us framing them, not the reverse,
          // so DENY costs nothing here.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
