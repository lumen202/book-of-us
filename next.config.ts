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
};

export default nextConfig;
