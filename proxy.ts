import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // `icon` (loose prefix — also covers `icon-192`/`icon-512`, the manifest's
    // Android sizes), `apple-icon`, and `manifest.webmanifest` are all
    // generated metadata routes with no file extension in their URL, so the
    // extension exclusion below doesn't catch them — without this they 307
    // to /login for anyone not already signed in, including Android's own
    // background fetch when installing a home-screen shortcut (which is why
    // the installed icon wasn't the real one: Android never got to see it).
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
