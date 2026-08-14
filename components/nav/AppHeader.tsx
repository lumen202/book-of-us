import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { getActiveProjectFromCookies } from "@/lib/supabase/project.server";
import { DesktopMoreMenu } from "@/components/nav/DesktopMoreMenu";
import { MobileNavMenu } from "@/components/nav/MobileNavMenu";
import { NavLink } from "@/components/nav/NavLink";
import { NightModeIconToggle } from "@/components/nav/NightModeIconToggle";

export async function AppHeader() {
  // Only the keeper sees the Keeper menu. The routes behind it check again on
  // their own — hiding this is tidiness, not access control.
  const isAdmin = await isCurrentUserAdmin();
  // The demo account is admin/keeper by design, but "Passwords" specifically
  // must never show for it — see app/(app)/settings/actions.ts's
  // getPartnerEmail/changePartnerPassword comments for why. Both menus filter
  // it out of ADMIN_LINKS via this flag rather than only relying on the page
  // itself refusing, so a demo visitor never sees a dead-end link at all.
  const isDemo = (await getActiveProjectFromCookies()) === "demo";

  return (
    /*
      Sticky, not fixed: the nav has to stay reachable while reading a long
      shelf, and `sticky` keeps its layout box so nothing below needs a spacer
      offset that would then have to be maintained in two places.

      The scrim is doing real work, not decoration. The header's type is
      `.ink-legible` — pale letterforms with a halo, tuned to sit on the painted
      sky. Once the header stops scrolling, cream chapter cards travel *under*
      it, and pale-on-pale is unreadable for the moment a card is passing. A
      soft top-down wash of the scene's own paper colour keeps a consistent
      field behind the type without drawing a bar across the painting — it
      reads as light pooling at the top of the frame, which is where the sun
      already is.

      `-mb-*` on the scrim is avoided deliberately: it is a sibling absolutely
      positioned behind the row, so it adds no height and cannot shift the
      header's own layout.
    */
    <header className="sticky top-0 z-40 mx-auto flex w-full max-w-5xl items-center justify-between gap-x-5 px-6 pb-2 pt-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+1.75rem)] bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-scene-paper,var(--color-background))_82%,transparent)_0%,color-mix(in_srgb,var(--color-scene-paper,var(--color-background))_52%,transparent)_58%,transparent_100%)]"
      />
      <Link href="/" className="group flex flex-col text-ink">
        <span className="ink-legible ink-legible-label text-[10px] uppercase tracking-[0.28em] text-ink-muted">A keepsake</span>
        <span className="ink-legible font-serif text-2xl leading-none transition group-hover:text-accent">
          The Book of Us
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        <NightModeIconToggle />

        {/* Below `sm` (phones), this collapses into one hamburger menu
            instead of clumping every link side by side — see MobileNavMenu.
            Above `sm`, only the primary destinations sit inline; Settings/
            Keeper/"Step out for now" are one level down behind `More` — see
            DesktopMoreMenu and BUG-004 for why a flat equal-weight row was
            itself the problem, not just a mobile-width one. */}
        <div className="hidden items-center gap-5 sm:flex">
          <NavLink
            href="/"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Bookshelf
          </NavLink>
          <NavLink
            href="/bucket-list"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Bucket list
          </NavLink>
          <NavLink
            href="/places"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Places
          </NavLink>
          <NavLink
            href="/vault"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Vault
          </NavLink>
          <DesktopMoreMenu isAdmin={isAdmin} isDemo={isDemo} />
        </div>

        <MobileNavMenu isAdmin={isAdmin} isDemo={isDemo} />
      </div>
    </header>
  );
}
