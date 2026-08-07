"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavigationVeil } from "./NavigationVeil";

/**
 * A nav link that marks itself as the current section — "so we know what
 * page we're on" — without a tab bar, a pill, or a background highlight,
 * which would read as the generic app chrome `BUG-004` moved this header
 * away from. Just a color/underline shift on the link itself: `text-ink` +
 * an accent underline instead of the resting `text-ink-muted`, same
 * vocabulary the rest of this book already uses to mark "the thing that's
 * true right now" (see e.g. `TickTarget`'s filled ring).
 *
 * `/bucket-list` matches `/bucket-list/[id]` too (a promise's own album
 * page still reads as "you're in the Bucket List section"), so this is a
 * prefix match, not exact — except for `/`, which would otherwise match
 * every route.
 */
export function NavLink({
  href,
  children,
  onClick,
  className = "",
  activeClassName = "text-ink underline decoration-accent decoration-2 underline-offset-4",
  inactiveClassName = "text-ink-muted hover:text-ink",
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  /** Defaults suit the desktop inline row; `MobileNavMenu`'s list-item look passes its own. */
  activeClassName?: string;
  inactiveClassName?: string;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
      {/*
       * Must be a descendant of `<Link>` — that is `useLinkStatus`'s one
       * requirement — which is why the whole-screen veil is mounted from
       * inside each nav link rather than once at the layout. It renders
       * nothing at all unless a navigation from *this* link is pending.
       */}
      <NavigationVeil />
    </Link>
  );
}
