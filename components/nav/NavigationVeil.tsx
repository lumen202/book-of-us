"use client";

import { useLinkStatus } from "next/link";
import { Waiting } from "@/components/ui/Waiting";
import { WaitingScene } from "@/components/ui/WaitingScene";

/**
 * The wait between tapping a nav link and the next page arriving.
 *
 * A route's `loading.tsx` only appears once the navigation has *committed*. On
 * a dynamic route — every page in this book is one, they all read Supabase —
 * there is a window before that where the reader has tapped, nothing has moved,
 * and the old page is still sitting there looking clickable. Going from the
 * Vault to the Bookshelf is the one that shows it worst. This covers that
 * window, from the click itself.
 *
 * `useLinkStatus` (Next 15.3+) is the supported way to read it, and it must be
 * rendered *inside* a `<Link>` — hence living in `NavLink`'s children rather
 * than somewhere central. Next's own guidance is that this is a patch for a
 * slow transition rather than a first resort; here the slowness is inherent
 * (auth + query on every route), so it stays.
 *
 * ## The delay is the whole design
 *
 * A full-screen veil that flashed on every fast navigation is strictly worse
 * than no veil at all — it draws the eye to something already gone by the time
 * you look. `nav-veil` (in `globals.css`) starts at `opacity: 0` and animates
 * in only after 450ms, so a prefetched or otherwise quick navigation completes
 * and unmounts this before anything is ever painted.
 *
 * That threshold started at 180ms and was too eager: fast routes still caught
 * the leading edge of the fade and read as a glitch. If it ever needs tuning
 * again, raise the *delay* rather than shortening the fade — a slower entrance
 * is what keeps it feeling like a scene settling rather than a panel appearing.
 *
 * ## `pointer-events-none`
 *
 * This element is a descendant of the anchor that was just clicked, so a click
 * landing on the veil would re-trigger that same link. It doesn't need to
 * capture input — the navigation is already in flight — so it lets clicks
 * through rather than fighting its own parent.
 */
export function NavigationVeil({ label = "Turning the page…" }: { label?: string }) {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <span
      // z-60: above the reveal overlays (z-50) and the discovery layer (z-40),
      // because a navigation started from inside one of those should still
      // veil the whole screen, not appear behind the thing it's leaving.
      className="nav-veil pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-background/85 backdrop-blur-sm"
    >
      <WaitingScene />
      {/* `relative` to lift the mark above the scene's absolutely-positioned light. */}
      <span className="relative">
        <Waiting label={label} size="lg" />
      </span>
    </span>
  );
}
