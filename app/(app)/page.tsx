import { HomeCover } from "@/components/home/HomeCover";
import { ChapterCover } from "@/components/chapter/ChapterCover";
import { listChapters } from "@/lib/chapters/queries";
import { getRelationship } from "@/lib/relationship/queries";
import { getMonthsaryNumber } from "@/lib/relationship/monthsary";
import { pickMonthsaryMessage } from "@/lib/celebration/messages";
import { toLocalDate } from "@/lib/format/date";
import { ordinal } from "@/lib/format/ordinal";

export default async function HomePage() {
  const [chapters, relationship] = await Promise.all([listChapters(), getRelationship()]);
  const subtitle = relationship
    ? `${relationship.partner_a_name} & ${relationship.partner_b_name}`
    : undefined;

  // Clamped to at least 1: the real 1st monthsary isn't until a full month
  // has elapsed, but Celebration Mode (via the dev preview toggle) can be
  // forced on before then, and "Happy 0th Monthsary" would be a broken-
  // looking thing to show — the clamp only ever matters in that narrow
  // first-month window.
  const monthsaryNumber = relationship
    ? Math.max(1, getMonthsaryNumber(toLocalDate(relationship.started_at)))
    : null;
  const celebrationLabel =
    monthsaryNumber !== null ? `Happy ${ordinal(monthsaryNumber)} Monthsary` : undefined;
  const celebrationMessage = celebrationLabel ? pickMonthsaryMessage() : undefined;

  return (
    <HomeCover
      title="The Book of Us"
      subtitle={subtitle}
      celebrationLabel={celebrationLabel}
      celebrationMessage={celebrationMessage}
    >
      <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
        <h1 className="font-serif text-3xl text-ink">Chapters</h1>
        {chapters.length === 0 ? (
          <p className="text-ink-muted">No chapters yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {chapters.map((chapter) => (
              <ChapterCover key={chapter.id} chapter={chapter} />
            ))}
          </div>
        )}
      </main>
    </HomeCover>
  );
}
