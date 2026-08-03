import Link from "next/link";
import { notFound } from "next/navigation";
import { listDeletedBucketItems } from "@/lib/bucket-list/queries";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { listDeletedMemories, resolveMemoryMedia } from "@/lib/memories/queries";
import { listDeletedVaultItems } from "@/lib/vault/queries";
import { ArchiveList } from "@/components/archive/ArchiveList";
import { BucketListArchiveList } from "@/components/archive/BucketListArchiveList";
import { VaultArchiveList } from "@/components/archive/VaultArchiveList";

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

  const [deletedMemories, vaultItems, deletedBucketItems] = await Promise.all([
    listDeletedMemories(),
    listDeletedVaultItems(),
    listDeletedBucketItems(),
  ]);
  const memories = await resolveMemoryMedia(deletedMemories);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 pb-24 pt-8">
      <Link
        href="/"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the shelf
      </Link>

      <section className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Keeper only</span>
          <h1 className="ink-legible font-serif text-4xl leading-tight text-ink">Removed photos</h1>
          <p className="ink-legible max-w-xl text-sm leading-relaxed text-ink-muted">
            Everything taken off a page still lives here. Put one back whenever you like — or delete
            it for good, which erases the row and its files and cannot be undone.
          </p>
        </header>

        <ArchiveList memories={memories} />
      </section>

      <section className="flex flex-col gap-8 border-t border-border pt-12">
        <header className="flex flex-col gap-2">
          <h2 className="ink-legible font-serif text-3xl leading-tight text-ink">Removed from the vault</h2>
          <p className="ink-legible max-w-xl text-sm leading-relaxed text-ink-muted">
            Same rules — put one back, or delete it for good.
          </p>
        </header>

        <VaultArchiveList items={vaultItems} />
      </section>

      <section className="flex flex-col gap-8 border-t border-border pt-12">
        <header className="flex flex-col gap-2">
          <h2 className="ink-legible font-serif text-3xl leading-tight text-ink">Removed promises</h2>
          <p className="ink-legible max-w-xl text-sm leading-relaxed text-ink-muted">
            Same rules — put one back, or delete it for good. Any photos already kept for a
            removed promise are untouched either way; only the promise&apos;s own row is affected.
          </p>
        </header>

        <BucketListArchiveList items={deletedBucketItems} />
      </section>
    </main>
  );
}
