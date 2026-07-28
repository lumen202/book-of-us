/**
 * The moment between asking for a chapter and the chapter arriving.
 *
 * Next.js renders this the instant the link is tapped, in place of the page,
 * and swaps the real one in when it has streamed. Without it, a chapter with
 * fifty prints in it leaves the reader on the previous screen with nothing
 * happening — and a screen that does nothing does not read as "loading", it
 * reads as "broken", which is the specific thing this file exists to prevent.
 *
 * **It is not a spinner.** A spinner would be the first piece of generic
 * software in the book (see the experience-direction guardrails): it says an
 * application is busy. What should happen instead is that *the page is already
 * turning* — the album sheet is there, the mounts are there, the prints just
 * haven't developed yet. The reader is looking at the right page from the first
 * frame, and the photos arrive into the places already made for them.
 *
 * Which is also why the layout below deliberately mirrors the real chapter
 * page's: same header block, same album sheet, same tilted prints in the same
 * three columns — a real CSS grid, not `columns-*`. Anything that shifts when
 * the real content lands undoes the illusion, so when `MemoryGrid` moved off
 * CSS multi-column (it couldn't balance columns for a chapter with only one
 * or two prints — see that file's comment), this had to move with it or the
 * skeleton's three balanced columns would swap into the real page's lopsided
 * one, which is a worse jump than showing no skeleton at all.
 *
 * Six placeholder prints, because that is a screenful; a chapter with fewer
 * simply resolves before anyone counts, and one with more grows into the sheet
 * when it arrives.
 */

/** The same deterministic tilts the real prints use in `MemoryCard`. */
const TILTS = [-1.5, 1, -0.7, 1.4, -1.1, 0.6];

/** Matching the mounts on a real print, so nothing moves on the swap. */
function Corner({ className }: { className: string }) {
  return <span aria-hidden className={`absolute h-5 w-5 bg-ink/10 ${className}`} />;
}

export default function ChapterLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 pt-8"
      // The whole screen is provisional, so it is announced once, as one thing,
      // rather than as a dozen empty regions a screen reader would read out.
      aria-busy="true"
      aria-label="Opening this chapter"
    >
      <span className="ink-legible w-fit text-sm text-ink-muted">&larr; Back to the shelf</span>

      {/* The title block, in the shape the real one will take. */}
      <section className="flex max-w-2xl flex-col gap-3">
        <span className="ambient-developing block h-3 w-28 rounded-full bg-accent/25" />
        <span className="ambient-developing block h-9 w-72 rounded-lg bg-ink/10 sm:h-11" />
        <p className="ink-legible font-serif text-xl italic text-ink-muted/70">Turning to this page…</p>
      </section>

      <div className="relative rounded-[2rem] bg-surface/75 px-5 py-8 shadow-[0_30px_60px_-45px_rgba(43,23,29,0.75)] sm:px-10 sm:py-12">
        <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {TILTS.map((tilt, index) => (
            <div key={tilt} style={{ rotate: `${tilt}deg` }}>
              <div className="rounded-2xl bg-[#fffdf7] p-3 pb-4 shadow-[0_12px_24px_-14px_rgba(76,59,48,0.42)]">
                <div
                  className="ambient-developing relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink/[0.07]"
                  // Staggered so the sheet breathes in sequence rather than
                  // pulsing at the reader all at once.
                  style={{ animationDelay: `${index * 0.22}s` }}
                >
                  <Corner className="left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]" />
                  <Corner className="right-0 top-0 [clip-path:polygon(100%_0,100%_100%,0_0)]" />
                  <Corner className="bottom-0 left-0 [clip-path:polygon(0_100%,0_0,100%_100%)]" />
                  <Corner className="bottom-0 right-0 [clip-path:polygon(100%_100%,0_100%,100%_0)]" />
                </div>
                <div className="mt-3 px-1">
                  <span className="ambient-developing block h-3 w-24 rounded-full bg-ink/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
