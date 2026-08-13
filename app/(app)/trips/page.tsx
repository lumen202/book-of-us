import Link from "next/link";
import { formatMonthYear } from "@/lib/format/date";
import { getPlaceBySlug } from "@/lib/places/source";
import { listTrips } from "@/lib/trips/queries";

export default async function TripsPage() {
  const trips = await listTrips();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 pt-8 pb-20">
      <Link
        href="/"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the shelf
      </Link>

      <section className="flex max-w-2xl flex-col gap-3">
        <span className="ink-legible ink-legible-label text-[11px] uppercase tracking-[0.3em] text-accent">
          Trips
        </span>
        <h1 className="ink-legible font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Everywhere you&apos;ve gone together
        </h1>
        <p className="ink-legible font-serif text-xl italic text-ink-muted">
          {trips.length === 0
            ? "No trips filed away yet — start one from a chapter's composer."
            : "Each one gathers its own photographs, wherever they landed."}
        </p>
      </section>

      {trips.length > 0 && (
        <ol className="flex flex-col gap-5">
          {trips.map((trip, index) => {
            const place = trip.placeSlug ? getPlaceBySlug(trip.placeSlug) : null;
            const tiltClass = index % 2 === 0 ? "sm:rotate-[-0.45deg]" : "sm:rotate-[0.45deg]";
            return (
              <li key={trip.id}>
                <Link
                  href={`/trips/${trip.id}`}
                  className={`scene-card group relative flex flex-col gap-3 rounded-2xl border border-border/50 bg-surface/55 px-6 py-7 shadow-[0_14px_34px_-26px_rgba(43,36,28,0.35)] transition duration-500 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface/72 hover:shadow-[0_18px_40px_-24px_rgba(43,36,28,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${tiltClass}`}
                >
                  {(place?.province || trip.startedOn) && (
                    <span className="relative text-[11px] uppercase tracking-[0.26em] text-accent">
                      {[place?.province, trip.startedOn ? formatMonthYear(trip.startedOn) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                  <span className="relative font-serif text-3xl leading-tight text-ink">
                    {trip.title}
                  </span>
                  <span className="relative text-sm text-ink-muted transition group-hover:text-ink">
                    Open this trip
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
