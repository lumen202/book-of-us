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
    // `plate` is the bake easel (app/plate/[layer]) — a development-only route
    // that `scripts/bake-plates.ts` screenshots to repaint the ambient scene.
    // Excluded so re-baking the garden needs nothing but `npm run dev`, rather
    // than also needing working Supabase demo credentials on the machine. It is
    // a 404 in any production build (the guard is in the route itself), so this
    // adds no public surface — but if you change this line, re-check it from a
    // client with no session, per the note above.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|plate|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
