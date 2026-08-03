"use client";

import Link from "next/link";
import { CelebrationControls } from "@/components/dev/CelebrationControls";

/**
 * The keeper-only links + Celebration preview, shared between the desktop
 * `More` dropdown (`DesktopMoreMenu`) and the mobile hamburger menu
 * (`MobileNavMenu`) so a new admin-only page only ever needs to be added
 * here once.
 */
export const ADMIN_LINKS = [
  { href: "/archive", label: "Removed" },
  { href: "/keeper/passwords", label: "Passwords" },
  { href: "/keeper/visits", label: "Visits" },
];

export function AdminMenuItems({
  onNavigate,
  isDemo = false,
}: {
  onNavigate?: () => void;
  /** Hides "Passwords" — there's no real partner account for the demo to manage a password for, and no real one it should ever be able to reach either. See settings/actions.ts. */
  isDemo?: boolean;
}) {
  const links = isDemo ? ADMIN_LINKS.filter((link) => link.href !== "/keeper/passwords") : ADMIN_LINKS;

  return (
    <>
      <div className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className="rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:bg-accent-muted/40 hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-border pt-2">
        <CelebrationControls />
      </div>
    </>
  );
}
