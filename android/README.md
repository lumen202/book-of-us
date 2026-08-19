# The Android app

This is not a second codebase. It is a ~2MB shell whose only job is to open
`https://bookofus.vercel.app` full-screen, with the app's own icon, and no
browser address bar. The book itself — every page, every animation, all of
`lib/` — is the same Next.js app the web uses, served over the network. Ship a
change to Vercel and the Android app has it on next open; there is no second
release to cut.

The mechanism is a **Trusted Web Activity** (TWA): Android's own Chrome engine
renders the site, but the browser chrome is hidden *because Google has verified
that this app and this domain have the same owner*. That verification is the
only fragile part of the whole arrangement, and it is the part that fails
silently — see below.

## The one thing that breaks this

`https://bookofus.vercel.app/.well-known/assetlinks.json` must return **200**
to a client with **no cookies**. It contains this app's package name and the
SHA-256 fingerprint of the key it was signed with, and Google's verifier fetches
it with no session, no browser, and no way to report a problem to you.

If it returns anything else — a 307 to `/login` being the realistic failure, as
that is what this app's proxy does to any path it isn't told to skip — nothing
errors. The app still installs, still launches, still works. It just shows a
browser address bar at the top forever, and the cause is a file the app never
mentions. `proxy.ts` carries the exclusion and a comment explaining why; do not
remove `.well-known` from it.

Verify it the only way that actually tests it — sessionless:

```sh
curl -sI https://bookofus.vercel.app/.well-known/assetlinks.json   # want: 200
```

Your logged-in browser cannot perform this check, which is exactly why the bug
survives normal testing.

## The signing key

`android/bookofus.keystore` and `android/keystore-password.txt` are gitignored,
and both matter more than the APK does:

- Anything signed with this key installs **over** the existing app as an update.
- Anything signed with a **different** key cannot. Android refuses outright, and
  the app has to be uninstalled and reinstalled first.
- The fingerprint in `assetlinks.json` is this key's. A new key means editing
  that file and redeploying the website, or the address bar comes back.

Nothing is lost if it is uninstalled — every memory lives in Supabase, not on
the phone — but "please uninstall and reinstall the app" is a bad message to
send someone. **Back up both files somewhere private and off this machine.**

## Building

Needs JDK 17 and the Android SDK (build-tools 36.1.0). One-time: Bubblewrap
looks for the pre-2020 SDK layout, so `$ANDROID_HOME/bin` must exist —
`ln -s "$ANDROID_HOME/cmdline-tools/latest/bin" "$ANDROID_HOME/bin"` if it
doesn't.

```sh
npm run android:update    # regenerate the project after editing twa-manifest.json
npm run android:build     # produce a signed app-release-signed.apk
```

`twa-manifest.json` is committed and is the source of truth. Everything else
Bubblewrap generates (`app/`, `gradle*`, `build.gradle`, `settings.gradle`) is
build output and is gitignored — treat it as disposable and never hand-edit it,
because `android:update` will overwrite it.

## Shipping a new version to a phone

Bump `appVersionCode` (an integer, must increase) and `appVersionName` in
`twa-manifest.json`, then `npm run android:update && npm run android:build`.

Note that you almost never need to do this. The APK is a window; changing what
is *in* the book is a Vercel deploy. Rebuild the APK only when the icon, the
name, the splash colours, or the origin change.
