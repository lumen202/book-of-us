import Link from "next/link";
import { formatMonthDay } from "@/lib/format/date";
import { listBucketItems } from "@/lib/bucket-list/queries";
import { getBucketItemPhotoFlags, getMemoryChapterLinks } from "@/lib/memories/queries";
import { getAppNow } from "@/lib/relationship/devClock";
import { getDaysUntil, getNextChapterDate } from "@/lib/relationship/nextChapter";
import { createClient } from "@/lib/supabase/server";
import { BucketList } from "@/components/bucket-list/BucketList";
import { ClosingReflection } from "@/components/story/ClosingReflection";

/**
 * Things we still owe each other — a written page, not a task manager. See
 * `docs/agent/codebase-map/bucket-list.md` for why: every capability the
 * feature was asked for is here, none of it looks like Jira.
 *
 * Signs zero images itself — no cover photo per item, no thumbnail beside a
 * kept promise. A kept promise, or an open one with a reference photo, links
 * to it with text; the photo lives on the promise's own album page
 * (`/bucket-list/[id]`). `getBucketItemPhotoFlags` is the one concession:
 * a single batched, image-free query so an open item can even know to show
 * that link, without signing anything or querying per row.
 */
export default async function BucketListPage() {
  const items = await listBucketItems();

  const memoryIds = items
    .map((item) => item.memoryId)
    .filter((id): id is string => Boolean(id));
  const [memoryLinks, photoItemIds, auth] = await Promise.all([
    getMemoryChapterLinks(memoryIds),
    getBucketItemPhotoFlags(items.map((item) => item.id)),
    createClient().then((supabase) => supabase.auth.getUser()),
  ]);
  const currentUserId = auth.data.user?.id ?? null;

  const now = getAppNow();
  const nextChapterDate = getNextChapterDate(now);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pt-8">
        <Link
          href="/"
          className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
        >
          &larr; Back to the shelf
        </Link>

        <section className="flex max-w-2xl flex-col gap-3">
          <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">
            A page of its own
          </span>
          <h1 className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Things we still owe each other.
          </h1>
          <p className="ink-legible font-serif text-xl italic text-ink-muted">
            {items.length === 0
              ? "Nothing written down yet."
              : "Tick one when it's kept — it becomes a print in the album, right where it happened."}
          </p>
        </section>

        <BucketList
          items={items}
          memoryLinks={memoryLinks}
          photoItemIds={Array.from(photoItemIds)}
          currentUserId={currentUserId}
        />
      </main>

      <ClosingReflection
        nextChapterLabel={formatMonthDay(nextChapterDate)}
        daysUntilNextChapter={getDaysUntil(nextChapterDate, now)}
      />
    </>
  );
}
