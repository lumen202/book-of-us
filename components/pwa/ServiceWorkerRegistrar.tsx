"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js`, which is what turns the manifest into an actually
 * installable app on Android and gives the installed shortcut something to open
 * when the network is gone.
 *
 * Renders nothing. It lives in the root layout rather than inside `(app)` so
 * the worker is registered on the login screen too — otherwise the very first
 * visit, which is the one where Android decides whether to offer the install
 * prompt, happens with no worker at all.
 *
 * `updateViaCache: "none"` matters more than it looks: without it the browser
 * may serve `sw.js` itself from the HTTP cache for up to 24 hours, so a shipped
 * fix to the worker would sit unapplied on the devices that need it. The
 * `no-store` header on this path in `next.config.ts` is the other half of that.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Deliberately unawaited and failure-tolerant: the worker is an
    // enhancement, and a browser that refuses it (private mode, disabled
    // storage, an unsupported engine) should still get the whole book.
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {});
  }, []);

  return null;
}
