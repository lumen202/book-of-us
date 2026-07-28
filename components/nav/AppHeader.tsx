import Link from "next/link";
import { signOut } from "@/app/(app)/actions";
import { isCurrentUserAdmin } from "@/lib/auth/admin";

export async function AppHeader() {
  // Only the keeper sees the link. The route checks again on its own — hiding
  // this is tidiness, not access control.
  const isAdmin = await isCurrentUserAdmin();

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pb-2 pt-6">
      <Link href="/" className="group flex flex-col text-ink">
        <span className="ink-legible text-[10px] uppercase tracking-[0.28em] text-ink-muted">A keepsake</span>
        <span className="ink-legible font-serif text-2xl leading-none transition group-hover:text-accent">
          The Book of Us
        </span>
      </Link>
      <div className="flex items-center gap-5">
        {isAdmin && (
          <Link
            href="/archive"
            className="ink-legible text-[11px] uppercase tracking-[0.2em] text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Removed
          </Link>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="ink-legible text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Step out for now
          </button>
        </form>
      </div>
    </header>
  );
}
