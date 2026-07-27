/**
 * The app's notion of "today" — real time, with a dev-only escape hatch.
 *
 * `relationship.started_at` is 2026-06-05, so the first monthsary (2026-07-05)
 * is already behind the real calendar date, and chapter gating
 * (`getElapsedMonthsaries`) needs no help from a fixed anchor any more — the
 * real clock already demonstrates one unlocked chapter today. (An earlier
 * version of this file *did* pin a fixed date, back when the seeded start was
 * 2026-07-05 and the first monthsary hadn't happened yet locally. That's gone
 * now that the start date moved earlier — nothing to preview ahead of.)
 *
 * The `DEV_NOW` override stays as a convenience for previewing a *later*
 * monthsary than the one currently live — set `DEV_NOW=2026-08-05` in
 * `.env.local` to see the shelf as it'll look once August unlocks, without
 * waiting for the real date or editing chapter/relationship rows.
 *
 * **Production is untouched.** The override only ever applies when
 * `NODE_ENV !== "production"` — a real deployment (including Vercel preview
 * builds, which also build in production mode) always uses the real clock.
 */
export function getAppNow(): Date {
  if (process.env.NODE_ENV !== "production") {
    const override = process.env.DEV_NOW;
    if (override) {
      const parsed = new Date(override);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  return new Date();
}
