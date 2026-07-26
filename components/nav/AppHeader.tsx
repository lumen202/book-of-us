import Link from "next/link";
import { signOut } from "@/app/(app)/actions";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Link href="/" className="font-serif text-lg text-ink">
        The Book of Us
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Log out
        </button>
      </form>
    </header>
  );
}
