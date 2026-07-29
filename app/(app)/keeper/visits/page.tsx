import Link from "next/link";
import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { getPartnerVisitStats } from "@/lib/visits/queries";

function formatVisitedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Same `notFound()` treatment as the other keeper-only routes — it doesn't exist for the other account. */
export default async function KeeperVisitsPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const { total, lastVisitedAt } = await getPartnerVisitStats();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 pb-24 pt-8">
      <Link
        href="/"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the shelf
      </Link>

      <header className="flex flex-col gap-2">
        <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Keeper only</span>
        <h1 className="ink-legible font-serif text-4xl leading-tight text-ink">Visits</h1>
      </header>

      <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-7">
        <p className="text-sm leading-relaxed text-ink-muted">How many times your partner has opened this book.</p>
        <p className="font-serif text-6xl leading-none text-ink">{total}</p>
        <p className="text-sm text-ink-muted">
          {lastVisitedAt ? <>Last time, {formatVisitedAt(lastVisitedAt)}.</> : "Not yet — no visits logged."}
        </p>
      </section>
    </main>
  );
}
