import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMonthYear } from "@/lib/format/date";
import { getCommentsForMemories, groupCommentsByMemory } from "@/lib/comments/queries";
import { albumPrints, getTripMemories, resolveMemoryMedia } from "@/lib/memories/queries";
import { getPlaceBySlug } from "@/lib/places/source";
import { getReactionsForMemories, groupReactionsByMemory } from "@/lib/reactions/queries";
import { createClient } from "@/lib/supabase/server";
import { getTrip } from "@/lib/trips/queries";
import { MemoryGrid } from "@/components/memory/MemoryGrid";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  const memories = albumPrints(
    await resolveMemoryMedia(await getTripMemories(trip.id), { full: false }),
  );
  const memoryIds = memories.map((memory) => memory.id);

  const [reactions, comments, auth] = await Promise.all([
    getReactionsForMemories(memoryIds),
    getCommentsForMemories(memoryIds),
    createClient().then((supabase) => supabase.auth.getUser()),
  ]);
  const reactionsByMemory = groupReactionsByMemory(reactions);
  const commentsByMemory = groupCommentsByMemory(comments);
  const user = auth.data.user;

  const place = trip.placeSlug ? getPlaceBySlug(trip.placeSlug) : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pt-8 pb-20">
      <Link
        href="/trips"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to trips
      </Link>

      <section className="flex max-w-2xl flex-col gap-3">
        {(place?.province || trip.startedOn) && (
          <span className="ink-legible ink-legible-label text-[11px] uppercase tracking-[0.3em] text-accent">
            {[place?.province, trip.startedOn ? formatMonthYear(trip.startedOn) : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
        <h1 className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">
          {trip.title}
        </h1>
        <p className="ink-legible font-serif text-xl italic text-ink-muted">
          {memories.length === 0
            ? "Nothing filed under this trip yet."
            : place?.note || "Wherever these were taken, they belong together."}
        </p>
      </section>

      <MemoryGrid
        memories={memories}
        context={{ kind: "trip", tripId: trip.id }}
        reactionsByMemory={reactionsByMemory}
        commentsByMemory={commentsByMemory}
        currentUserId={user?.id ?? null}
      />
    </main>
  );
}
