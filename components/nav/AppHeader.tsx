import Link from "next/link";
import { signOut } from "@/app/(app)/actions";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { AdminMenu } from "@/components/nav/AdminMenu";
import { MobileNavMenu } from "@/components/nav/MobileNavMenu";
import { NightModeIconToggle } from "@/components/nav/NightModeIconToggle";

export async function AppHeader() {
  // Only the keeper sees the Keeper menu. The routes behind it check again on
  // their own — hiding this is tidiness, not access control.
  const isAdmin = await isCurrentUserAdmin();

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-x-5 px-6 pb-2 pt-6">
      <Link href="/" className="group flex flex-col text-ink">
        <span className="ink-legible text-[10px] uppercase tracking-[0.28em] text-ink-muted">A keepsake</span>
        <span className="ink-legible font-serif text-2xl leading-none transition group-hover:text-accent">
          The Book of Us
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        <NightModeIconToggle />

        {/* Below `sm` (phones), this collapses into one hamburger menu
            instead of clumping every link side by side — see MobileNavMenu. */}
        <div className="hidden items-center gap-5 sm:flex">
          <Link
            href="/"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Bookshelf
          </Link>
          <Link
            href="/bucket-list"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Bucket list
          </Link>
          <Link
            href="/vault"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Vault
          </Link>
          <Link
            href="/settings"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Settings
          </Link>
          {isAdmin && <AdminMenu />}
          <form action={signOut}>
            <button
              type="submit"
              className="ink-legible cursor-pointer text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Step out for now
            </button>
          </form>
        </div>

        <MobileNavMenu isAdmin={isAdmin} />
      </div>
    </header>
  );
}
