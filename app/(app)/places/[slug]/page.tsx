import Link from "next/link";
import { notFound } from "next/navigation";
import { InteractiveMap } from "@/components/places/InteractiveMap";
import { PlaceGallery } from "@/components/places/PlaceGallery";
import { PlaceImageFrame } from "@/components/places/PlaceImageFrame";
import { PlaceRail } from "@/components/places/PlaceRail";
import { SaveActions } from "@/components/places/SaveActions";
import { ShareButtons } from "@/components/places/ShareButtons";
import { ClosingReflection } from "@/components/story/ClosingReflection";
import { formatMonthDay } from "@/lib/format/date";
import { HERO_SIZES } from "@/lib/places/images";
import { getSavedSlugs } from "@/lib/places/journal/queries";
import {
  dealsSearchUrl,
  directionsUrl,
  geoUri,
  googleMapsUrl,
  nearbyHotelsUrl,
  nearbyRestaurantsUrl,
} from "@/lib/places/maps";
import { getPlaceBySlug, getRelatedPlaces } from "@/lib/places/source";
import {
  ACTIVITY_LABELS,
  AUDIENCE_LABELS,
  BUDGET_HINTS,
  BUDGET_LABELS,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  DOT_TOURIST_ASSISTANCE_URL,
  formatMonthRange,
  NATIONWIDE_EMERGENCY_NUMBER,
  TRIP_LENGTH_LABELS,
} from "@/lib/places/taxonomy";
import { estimateTrip, formatDistanceKm } from "@/lib/places/trip";
import { toSummary } from "@/lib/places/types";
import { recordPlaceShown } from "../actions";
import { getAppNow } from "@/lib/relationship/devClock";
import { getDaysUntil, getNextChapterDate } from "@/lib/relationship/nextChapter";

const ENTRANCE_FEE_LABELS = {
  none: "Free",
  small: "A small fee",
  moderate: "A moderate fee",
  steep: "A steep fee",
  varies: "Varies",
} as const;

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = getPlaceBySlug(slug);
  if (!place) notFound();

  // Best-effort — a viewer opening a destination straight from a link (not
  // through a discovery mode) still counts as "seen it" for future picks.
  // Never blocks the page on it, and a failure here (e.g. a flaky insert)
  // must not turn "opening a destination page" into a visible error.
  void recordPlaceShown(place.slug, "view").catch(() => {});

  const [wishlistSet, visitedSet] = await Promise.all([
    getSavedSlugs("wishlist"),
    getSavedSlugs("visited"),
  ]);
  const related = getRelatedPlaces(place).map(toSummary);
  const now = getAppNow();
  const nextChapterDate = getNextChapterDate(now);

  return (
    <>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 pt-8">
        <Link
          href="/places"
          className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
        >
          &larr; Back to places
        </Link>

        <PlaceImageFrame
          image={place.heroImage}
          sizes={HERO_SIZES}
          priority
          creditPlacement="corner"
          className="aspect-[16/10] w-full rounded-2xl border border-border shadow-[0_20px_40px_-24px_rgba(76,59,48,0.45)]"
        />

        {/*
         * Everything textual sits on real paper, not straight on the
         * painted scene.
         *
         * An earlier pass tried to solve legibility with `.ink-legible`
         * alone — but that class only paints a *halo* around glyphs
         * (`globals.css`), it doesn't change their colour, and warm brown
         * ink over the night meadow's own mid-tones stays muddy no matter
         * how good the halo is. `.ink-legible` is built for short,
         * large-type runs with a lot of space around them (a page heading,
         * the closing reflection), not for two dozen small labels and a
         * body-copy column. The rest of the book already solved this the
         * other way: every dense block of type in the app is on a
         * `bg-surface` card (see `reading-experience.md`, and `.scene-card`
         * in `globals.css`, which exists precisely so those cards stay
         * opaque against the night backdrop). This page now does the same.
         */}
        <div className="scene-card flex flex-col gap-10 rounded-[1.5rem] border border-border bg-surface px-6 py-8 shadow-[0_20px_40px_-28px_rgba(76,59,48,0.45)] sm:px-8 sm:py-10">
        <section className="flex flex-col gap-3">
          <span className="text-[11px] uppercase tracking-[0.28em] text-accent">
            {place.category.map((c) => CATEGORY_LABELS[c]).join(" · ")}
            {place.hiddenGem ? " · Hidden gem" : ""}
          </span>
          <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">{place.name}</h1>
          <p className="text-sm text-ink-muted">
            {[place.city, place.province].filter(Boolean).join(", ")} · {place.region}
          </p>
          <p className="max-w-xl font-serif text-xl italic leading-relaxed text-ink-muted">{place.note}</p>
        </section>

        <PlaceGallery images={[place.heroImage, ...place.gallery]} />

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={googleMapsUrl(place)}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full bg-accent px-6 py-2.5 text-[11px] uppercase tracking-[0.24em] text-surface shadow-[0_8px_16px_-8px_rgba(76,59,48,0.5)] transition hover:brightness-95"
          >
            Open in Maps
          </a>
          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full border border-border bg-surface px-6 py-2.5 text-[11px] uppercase tracking-[0.24em] text-ink transition hover:border-accent hover:text-accent"
          >
            Directions
          </a>
          <a
            href={geoUri(place)}
            className="rounded-full border border-border bg-surface px-6 py-2.5 text-[11px] uppercase tracking-[0.24em] text-ink transition hover:border-accent hover:text-accent"
          >
            Open in your maps app
          </a>
        </div>

        <SaveActions
          slug={place.slug}
          initialWishlisted={wishlistSet.has(place.slug)}
          initialVisited={visitedSet.has(place.slug)}
        />
        <div className="flex justify-center">
          <ShareButtons path={`/places/${place.slug}`} title={place.name} />
        </div>

        {/*
         * Prose is trimmed to a lead, not printed in full.
         *
         * A Wikipedia intro runs several paragraphs and the History section
         * can run *pages* — printed verbatim they turned this into an
         * encyclopedia article with photos attached, which is exactly the
         * "browsing a spreadsheet" register the brief and
         * `experience-direction.md` both push against. Photographs are what
         * actually make someone want to go somewhere; the words are here to
         * orient, and the full article is one tap away via the Wikipedia
         * link in Practical below.
         */}
        {/*
         * `description` is null for the seeds sourced from Wikidata + Commons
         * rather than an article (Osmeña Peak, Sambawan Island — English
         * Wikipedia has no article for either). The editorial note is the
         * fallback rather than an empty section or a "no description
         * available" line: it is the one sentence written in this book's own
         * voice, and reading it alone is a better answer to "what is this
         * place" than an apology for missing prose.
         */}
        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-2xl text-ink">The story</h2>
          <p className="whitespace-pre-line text-ink">
            {place.description ? leadParagraphs(place.description, 2) : place.note}
          </p>
        </section>

        {place.history && place.wikipediaUrl && (
          <section className="flex flex-col gap-3">
            <h2 className="font-serif text-2xl text-ink">A little history</h2>
            <p className="whitespace-pre-line text-ink">{leadParagraphs(place.history, 1)}</p>
            <a
              href={place.wikipediaUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="w-fit text-[11px] uppercase tracking-[0.2em] text-ink-muted underline decoration-border underline-offset-4 transition hover:text-accent"
            >
              Read the rest
            </a>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-2xl text-ink">On the map</h2>
          <InteractiveMap place={place} />
          <p className="text-xs text-ink-muted">{formatDistanceKm(estimateTrip(place).distanceKm)}</p>
        </section>

        <section className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Fact label="Best months" value={formatMonthRange(place.bestMonths)} />
          <Fact label="Budget" value={`${BUDGET_LABELS[place.budget]} — ${BUDGET_HINTS[place.budget]}`} />
          <Fact label="Difficulty" value={DIFFICULTY_LABELS[place.difficulty]} />
          <Fact label="Time needed" value={place.travelTime.map((t) => TRIP_LENGTH_LABELS[t]).join(" or ")} />
          <Fact label="Entrance fee" value={ENTRANCE_FEE_LABELS[place.entranceFee.kind]} note={place.entranceFee.note} />
          <Fact label="Good for" value={place.audience.map((a) => AUDIENCE_LABELS[a]).join(", ") || "Anyone"} />
        </section>

        {place.activities.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-serif text-2xl text-ink">Things to do</h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
              {place.activities.map((activity) => (
                <li key={activity} className="before:mr-2 before:text-accent before:content-['·']">
                  {ACTIVITY_LABELS[activity]}
                </li>
              ))}
            </ul>
          </section>
        )}

        {place.tips.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-serif text-2xl text-ink">Travel tips</h2>
            <ul className="flex flex-col gap-2 text-sm text-ink">
              {place.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span aria-hidden className="text-accent">
                    —
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-2xl text-ink">Practical</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink">
            <li>
              <a href={dealsSearchUrl(place)} target="_blank" rel="noreferrer noopener" className="underline decoration-border underline-offset-4 transition hover:text-accent">
                Check current tour &amp; flight deals
              </a>
              <span className="block text-xs text-ink-muted">A live search — not stored here, so it&apos;s never stale.</span>
            </li>
            <li>
              <a href={nearbyHotelsUrl(place)} target="_blank" rel="noreferrer noopener" className="underline decoration-border underline-offset-4 transition hover:text-accent">
                Places to stay nearby
              </a>
            </li>
            <li>
              <a href={nearbyRestaurantsUrl(place)} target="_blank" rel="noreferrer noopener" className="underline decoration-border underline-offset-4 transition hover:text-accent">
                Places to eat nearby
              </a>
            </li>
            {place.wikipediaUrl && (
              <li>
                <a href={place.wikipediaUrl} target="_blank" rel="noreferrer noopener" className="underline decoration-border underline-offset-4 transition hover:text-accent">
                  Read more on Wikipedia
                </a>
              </li>
            )}
            {place.officialWebsite && (
              <li>
                <a href={place.officialWebsite} target="_blank" rel="noreferrer noopener" className="underline decoration-border underline-offset-4 transition hover:text-accent">
                  Official tourism site
                </a>
              </li>
            )}
            <li className="pt-1 text-ink-muted">
              In an emergency anywhere in the country: {NATIONWIDE_EMERGENCY_NUMBER.number} ({NATIONWIDE_EMERGENCY_NUMBER.label}).{" "}
              <a href={DOT_TOURIST_ASSISTANCE_URL} target="_blank" rel="noreferrer noopener" className="underline decoration-border underline-offset-4 transition hover:text-accent">
                DOT tourist assistance
              </a>
            </li>
          </ul>
        </section>

        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Photograph via Wikimedia Commons — see the credit on the image above.
        </p>
        </div>

        {/* Outside the paper card — a rail of photographs needs no card behind it, and its own cards carry their type. */}
        {related.length > 0 && (
          <section className="flex flex-col gap-4 pt-4">
            <h2 className="ink-legible font-serif text-2xl text-ink">Nearby, or nearby in spirit</h2>
            <PlaceRail places={related} />
          </section>
        )}
      </main>

      <ClosingReflection
        nextChapterLabel={formatMonthDay(nextChapterDate)}
        daysUntilNextChapter={getDaysUntil(nextChapterDate, now)}
      />
    </>
  );
}

/**
 * The first `count` paragraphs of a fetched Wikipedia extract.
 *
 * See the note at the "The story" section for why this trims rather than
 * prints in full: the source articles run long, and the full text is always
 * one tap away on Wikipedia itself.
 */
function leadParagraphs(text: string, count: number): string {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(0, count)
    .join("\n\n");
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">
        {value}
        {note && <span className="block text-xs text-ink-muted">{note}</span>}
      </dd>
    </div>
  );
}
