# Places: first-look fixes + Leyte/Region VIII additions

**2026-08-08.** Follow-up to `2026-08-07-places-destination-discovery.md` — the user tried the
feature live (screenshots, real device zoom) and reported five real defects, all fixed same
session. Also added six Leyte/Region VIII destinations and a small hand-set personalization boost,
at the user's request (see `preferences.ts`).

## The five defects, and the actual root cause of each

1. **Card images showing the browser's broken-image glyph.** Root cause was ambiguous (could have
   been that a temporary dev server used for the session's own smoke-test was killed mid-view), but
   the underlying design was fixed regardless: `PlaceImageFrame`/`PlaceGallery` now render Wikimedia
   images with `unoptimized` on `next/image`. These are already Commons thumbnails capped at 1600px
   by `scripts/build-places.ts`, not raw originals — there was nothing left for Next's own Image
   Optimization API to usefully do, and skipping it removes a whole class of failure (optimizer
   cold starts, upstream rate limits on the proxy's own fetch, `remotePatterns` misconfiguration)
   for content that never needed a second re-encode.

2. **Text unreadable in Celebration/night mode.** Every heading/label on the three new pages sat
   directly on the ambient backdrop with no `.ink-legible` class — the one thing that keeps
   card-less text readable against `StorybookSky`'s night palette (see `theming.md`). Missed
   entirely on the first pass; fixed by adding `ink-legible` at the `<main>`/wrapper level on all
   three pages rather than per element, since `text-shadow` is CSS-inherited — one declaration
   covers every descendant heading, label, and fact.

3. **The wheel's category labels were illegible and misoriented.** The root problem: 20 wedges at
   18° each is not enough angular room for straight, centre-pointing rotated text — full category
   names either overlapped their neighbours or ran outside their own wedge regardless of font size.
   Rebuilt with SVG `<textPath>` labels that curve along the wheel's own rim instead of pointing
   radially, `WHEEL_LABELS` in `taxonomy.ts` (short, wheel-only forms — "Nat'l park" not "National
   parks"), and a `flip` per wedge (drawing the label's arc backwards on the bottom half of the
   circle) so nothing reads upside-down. The pointer moved from a sibling HTML `<div>` to a path
   *inside* the SVG's own viewBox, so it scales with the wheel at every breakpoint instead of only
   matching one hardcoded pixel size.

4. **The reveal modal's × sat behind the hero photo, nearly invisible.** The button was inset
   (`right-4 top-4`) inside the panel's own padding, but the reveal's hero image fills almost the
   entire padded width right up to the top — the math didn't clear it (32px button, 28px padding).
   Moved outside the card entirely (`-right-3 -top-3`, same convention `CompletionModal`'s
   photo-remove × already uses), where it's always over the blurred dark backdrop, never a photo.

5. **Background visibly scrolling / top and bottom of a tall modal unreachable, worse when
   pinch-zoomed.** Two separate causes, both in `PlaceRevealOverlay`:
   - No body-scroll lock while the overlay was open — added `useBodyScrollLock`
     (`lib/navigation/useBodyScrollLock.ts`, new, reusable), the missing piece that made the page
     behind the modal feel like it was scrolling.
   - The modal's centering (`flex items-center justify-center`) and its scrolling
     (`overflow-y-auto`) lived on the *same* element, which is a well-known trap: centering a flex
     item taller than its container pushes it equally past both edges, and `overflow: auto` on
     that same box can't scroll past centre to the true top. Split into two elements — outer
     `overflow-y-auto` in plain block flow, inner `min-h-full flex items-center justify-center` —
     which is the standard fix and is what actually made both ends of a tall card reachable,
     including at high pinch-zoom (explicitly called out as the primary real-world case: this app
     is mostly used on a phone).

## Leyte/Region VIII additions + a small personalization nudge

Added six real, source-verified destinations: Lake Danao, San Juanico Bridge, Cuatro Islas,
Biliran, and Tacloban (all Region VIII), on top of the existing Kalanggaman Island — 55 places
total now. `lib/places/preferences.ts` is new: `FAVORITE_REGIONS` (Eastern Visayas) and
`FAVORITE_CATEGORIES` (`mountain`, `nature`, per the user's partner's stated preference) each add a
small weight in `engine.ts`'s `weightFor` — a nudge, not a filter, same mechanism as the existing
seasonal/featured boosts. Hand-set constants, same convention as `CURRENT_SEASON`/`HOME_BASE` —
edit them directly if this stops being true.

## What the next session should know

- `PlaceRevealOverlay`'s split centering/scrolling structure is load-bearing — if it's ever
  "simplified" back to one flex element with both `items-center` and `overflow-y-auto`, the
  top-of-tall-content bug comes back. Don't collapse those two `<div>`s.
- `useBodyScrollLock` is new and currently only wired into `PlaceRevealOverlay`. `CompletionModal`
  and other existing modals in the app don't have it either — a pre-existing gap this session
  didn't touch, out of scope for a Places-focused pass, but worth knowing if a future session is
  doing a modal-consistency sweep.
- If another wheel-style component is ever needed, `SpinWheel.tsx`'s `labelArcPath`/`flip` pattern
  (curved `textPath` labels, backwards arc on the lower half) is the reusable idea — it isn't
  extracted into a shared helper yet because there's only one caller.
