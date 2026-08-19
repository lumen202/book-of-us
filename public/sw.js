/*
 * The service worker. Its only job is to make the installed app open to
 * something other than a dinosaur when the network is gone — it is NOT an
 * offline mode for the book itself.
 *
 * That distinction is the whole design. This app is two people's private
 * record: photos come from Supabase Storage as signed URLs, pages are rendered
 * per-session, and a cache is shared by every account that has ever used this
 * browser profile. So the rule here is absolute and deliberately conservative:
 *
 *   nothing that could be user-specific is ever written to the cache.
 *
 * Concretely, only two things are cached — the offline page (public, static,
 * identical for everyone) and `/_next/static/*` (content-hashed build output,
 * so a stale entry is impossible by construction and a shared entry is
 * harmless). Everything else — navigations, RSC payloads, Server Action POSTs,
 * `/_next/image` (which proxies signed private photos), `/api`, and every
 * cross-origin request including Supabase itself — goes straight to the
 * network, untouched and unrecorded.
 *
 * If you are tempted to add caching for real pages so the book reads offline:
 * that is a real feature, but it needs per-user cache partitioning and a wipe
 * on sign-out, and neither exists here. Do not approximate it by widening the
 * rules below.
 */

// Bump on every change to this file. Old caches are dropped on activate.
const CACHE = "bookofus-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `reload` so an install never adopts a stale copy from the HTTP cache.
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      // Take over immediately rather than waiting for every tab to close;
      // paired with `clients.claim()` below so a fresh worker is never left
      // idle behind an old one.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever interested in same-origin reads. Anything else — a POST (which
  // includes every Server Action in this app), a Supabase call, a Wikimedia
  // atlas image — is none of this worker's business.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Build output is content-hashed, so the URL changes whenever the bytes do.
  // Cache-first is safe here in a way it is nowhere else in this app.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Page loads: always the network, because the answer depends on who is
  // signed in. The cache is consulted only once the network has actually
  // failed, and only to show the offline page — the real response is never
  // stored.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match(OFFLINE_URL);
          return (
            cached ??
            new Response("Offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
  }

  // Everything else falls through to the browser untouched.
});
