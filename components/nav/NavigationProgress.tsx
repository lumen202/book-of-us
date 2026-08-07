"use client";

import { useLinkStatus } from "next/link";

/**
 * A thin warm line creeping across the top edge while a navigation is in
 * flight. The page you are leaving stays exactly as it was underneath.
 *
 * A route's `loading.tsx` only appears once a navigation has *committed*. Every
 * page here is dynamic — they all read Supabase — so there is a window between
 * the tap and the commit where nothing moves and the old page still looks
 * clickable. Going from the Vault to the Bookshelf is the one that shows it
 * worst. This covers that window, from the click itself.
 *
 * `useLinkStatus` (Next 15.3+) is the supported way to read it, and it must be
 * rendered *inside* a `<Link>` — hence living in `NavLink`'s children rather
 * than somewhere central.
 *
 * ## Why a line and not a scene
 *
 * This started as a full-screen veil: the page behind it blurred, a bloom of
 * warm light, motes, and "Turning the page…" in the middle. It was wrong twice
 * over. The see-through blur left a smeared ghost of the page you were leaving,
 * which reads as a rendering fault rather than as atmosphere; and a whole-screen
 * takeover is far too much ceremony for something that resolves in under a
 * second. It also meant the *thing you asked to leave* was still the loudest
 * object on screen, just illegible.
 *
 * A line at the edge says the same thing without claiming the screen: work is
 * happening, the page you can still read is still yours, and nothing has been
 * taken away yet. The full scene (`WaitingScene`) still exists and is still
 * right for a route's `loading.tsx`, where the old page is genuinely gone and
 * something has to fill the space.
 *
 * ## Indeterminate on purpose
 *
 * There is no real progress to report — Next gives a boolean, not a fraction.
 * So `nav-progress` eases toward the right and *never arrives*: quickly at
 * first, then slower and slower, approaching but never reaching the full width.
 * A bar that filled to 100% and then sat there would be claiming the page had
 * loaded while it plainly hadn't. Arrival is the new page appearing, which
 * unmounts this.
 */
export function NavigationProgress() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <span
      aria-hidden
      // z-60: above the reveal overlays (z-50) and the discovery layer (z-40),
      // so a navigation started from inside one of those is still visible.
      // `pointer-events-none` because this is a descendant of the anchor that
      // was just clicked, and a click landing on it would re-trigger the link.
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] block h-[3px]"
    >
      <span className="nav-progress block h-full w-full origin-left bg-gradient-to-r from-accent to-accent-warm shadow-[0_0_8px_rgba(0,0,0,0.12)]" />
    </span>
  );
}
