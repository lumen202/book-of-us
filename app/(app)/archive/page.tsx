import Link from "next/link";
import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { listDeletedMemories, resolveMemoryMedia } from "@/lib/memories/queries";
import { ArchiveList } from "@/components/archive/ArchiveList";

/**
 * The admin's trash.
 *
 * `notFound()` rather than a "you don't have access" screen: for everyone
 * except the keeper of the book, this route simply doesn't exist. There's no
 * reason for the other partner to learn there's a page they can't open.
 *
 * Note this is outside the storybook framing on purpose — it's maintenance,
 * not part of the reading experience, and dressing it up as a keepsake would
 * make a destructive screen feel gentler than it is.
 */
export default async function ArchivePage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const memories = await resolveMemoryMedia(await listDeletedMemories());

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 pb-24 pt-8">
      <Link
        href="/"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the shelf
      </Link>

      <header className="flex flex-col gap-2">
        <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Keeper only</span>
        <h1 className="ink-legible font-serif text-4xl leading-tight text-ink">Removed photos</h1>
        <p className="ink-legible max-w-xl text-sm leading-relaxed text-ink-muted">
          Everything taken off a page still lives here. Put one back whenever you like — or delete
          it for good, which erases the row and its files and cannot be undone.
        </p>
      </header>

      <ArchiveList memories={memories} />
    </main>
  );
}
