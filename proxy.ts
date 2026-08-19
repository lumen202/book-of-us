import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything listed here is fetched by something that is NOT a browser tab
    // with a session — the OS install machinery, Google's app-verification
    // crawler, the service worker's own update check. None of them carry a
    // cookie, none of them will ever have one, and none of them report an
    // error when they get a 307 to /login: they take the redirect, get HTML
    // where they expected JSON/an image/JavaScript, and quietly substitute a
    // default. That is a fix-shaped bug with no failure signal, and this repo
    // has now been bitten by it twice (favicon, then the manifest), so keep
    // this list verbatim and re-check any change to it with a sessionless
    // client: `curl -I https://<host>/<path>` must show 200, never 307.
    //
    // `icon` (loose prefix — also covers `icon-192`/`icon-512`, the manifest's
    // Android sizes), `apple-icon`, and `manifest.webmanifest` are all
    // generated metadata routes with no file extension in their URL, so the
    // extension exclusion below doesn't catch them — without this they 307
    // to /login for anyone not already signed in, including Android's own
    // background fetch when installing a home-screen shortcut (which is why
    // the installed icon wasn't the real one: Android never got to see it).
    // `.well-known` carries `assetlinks.json`, which Google fetches with no
    // session to verify the Android app owns this domain; a 307 there doesn't
    // fail loudly, it just silently downgrades the installed app to showing a
    // browser address bar. `sw.js` is the service worker — the browser
    // re-fetches it on its own schedule, outside any page, so a redirect there
    // kills offline support with no console error on the page that registered
    // it. `offline` is the fallback page the worker shows when the network is
    // gone; it must be reachable with no session because the whole point is
    // that we cannot reach Supabase to establish one.
    // `plate` is the bake easel (app/plate/[layer]) — a development-only route
    // that `scripts/bake-plates.ts` screenshots to repaint the ambient scene.
    // Excluded so re-baking the garden needs nothing but `npm run dev`, rather
    // than also needing working Supabase demo credentials on the machine. It is
    // a 404 in any production build (the guard is in the route itself), so this
    // adds no public surface.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|\\.well-known|sw\\.js|offline|plate|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
