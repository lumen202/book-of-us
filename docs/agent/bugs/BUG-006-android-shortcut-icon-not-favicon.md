# BUG-006: Android "Add to Home Screen" shortcut used a generic icon, not the app's favicon
- **Found:** 2026-08-03
- **Where:** no `app/manifest.ts` existed at all; the favicon (`app/icon.tsx`, 32x32) is the only
  size a browser tab needs, but Android's install/"Add to Home Screen" flow reads a Web App
  Manifest's `icons` array for a properly-sized icon (192px/512px) — with none declared, it fell
  back to a generic icon instead of the real one.
- **Symptom:** Installing the app to an Android home screen produced a shortcut icon that wasn't
  the book-and-heart favicon.
- **Status:** fixed (2026-08-03) — added `app/manifest.ts` plus `app/icon-192/route.tsx` and
  `app/icon-512/route.tsx` (the latter with extra safe-zone padding, `purpose: maskable`, since
  Android may crop it to a circle/squircle/rounded square) and `app/apple-icon.tsx` for iOS. All
  three generated sizes share one drawing function, `lib/icon/bookGlyph.tsx`, so the mark can't
  drift between sizes.

  Also had to fix `proxy.ts`'s auth-middleware matcher — `manifest.webmanifest` and `apple-icon`
  were both getting 307-redirected to `/login` for unauthenticated requests (confirmed via curl),
  which is exactly what would have silently defeated the manifest fix on its own: Android's
  background fetch for install metadata has no session, so it would have kept seeing a redirect
  instead of the icon even after the manifest existed. This is the same class of bug as the
  original favicon 307 issue from earlier in the project.
