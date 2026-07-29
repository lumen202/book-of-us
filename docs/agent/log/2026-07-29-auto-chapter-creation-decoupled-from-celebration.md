# 2026-07-29 — Chapters auto-created on the 1st, decoupled from Celebration Mode

## Why

Chapters were never auto-created at all — `resolveTargetChapter`'s own doc comment says "chapters
aren't pre-seeded" and the only way one gets written is a manual insert (`supabase/seed.sql`'s
convention). The ask: generate the current month's chapter automatically at the start of the month
so there's somewhere to add photos all month, while keeping Celebration Mode itself exactly where
it is — the 5th, `isCelebrationDay()`, unchanged.

Doing that exposed a real coupling in the existing design: chapter *reveal* (visible on the shelf,
valid as an upload target) was gated by counting elapsed monthsaries since
`relationship.started_at` (see
`2026-07-27-chapter-gating-corrected-to-monthsary-count.md`), which only advances on the 5th. So
even with a chapter row pre-created on the 1st, nothing would have shown or accepted uploads for it
until its own monthsary five days later — uploads and celebration were the same gate. Confirmed
with the user this should change: the new month's chapter should be visible and open for uploads
immediately on the 1st; the 5th should only change the atmosphere (Celebration Mode), not
visibility.

That in turn creates a second problem, caught by the user before it shipped: if the current
month's chapter is visible and uploadable from the 1st, by the time its own monthsary look-back
plays (celebrating the month that just *finished*), the current month may already hold four or
five days of new photos. The look-back beat has to keep showing last month, not leak the
in-progress current one.

## Shipped

- `lib/chapters/mutations.ts` (new): `ensureCurrentMonthChapter()`, an idempotent upsert
  (`onConflict: "month", ignoreDuplicates: true`) using the admin/service-role client — there's no
  signed-in user in a cron invocation to write through the normal RLS-scoped client.
- `app/api/cron/create-chapter/route.ts` (new): `GET`, gated on a `CRON_SECRET` bearer token
  (the header Vercel Cron sends automatically when that env var is set), calls
  `ensureCurrentMonthChapter()`.
- `vercel.json` (new): cron schedule `0 0 1 * *` for that route.
- `.env.local.example`: documented `CRON_SECRET`.
- `lib/supabase/admin.ts`: doc comment's "rules for touching this file" now names the cron route as
  the second legitimate caller alongside `requireAdmin()`-gated actions.
- `lib/chapters/queries.ts`: `listRevealedChapters()` no longer counts elapsed monthsaries. It's now
  a plain calendar check — `chapter.month <= start of this calendar month` — with no dependency on
  `relationship.started_at` at all. `getElapsedMonthsaries` (its only consumer) removed as dead
  code from `lib/relationship/nextChapter.ts`.
- `lib/relationship/nextChapter.ts`: `CHAPTER_DAY` changed from `5` to `1` — `getNextChapterDate`
  now points at the 1st, matching when chapters actually arrive. Celebration Mode's own day (the
  5th) is untouched; it was never defined by this constant, `isCelebrationDay()` hardcodes it
  separately.
- `components/story/ClosingReflection.tsx`: "The next chapter arrives on the 5th" → "on the 1st".
- `lib/memories/queries.ts`: `findLookBackPrints()` now takes a `now` param and filters out
  whichever chapter matches its year/month before searching for prints — never considers the
  current calendar month, regardless of what's in the `chapters` list passed in. This is the fix
  for the leak the user flagged: on August 5th this looks for July's chapter (and further back if
  July is empty), never August's, even though August's chapter has existed and accepted uploads
  since August 1st.
- `docs/agent/codebase-map/reading-experience.md`, `celebration-mode.md`: rewritten in place to
  describe the shipped model (living docs, not append-only).

## Verified

- `npx tsc --noEmit` clean.
- `npx eslint .` — no new errors from these changes (pre-existing unrelated errors in
  `lib/ambient/useMeteors.ts` and `lib/navigation/useCloseOnBack.ts` predate this session).

## Notes for next session

- **Not yet done**: `CRON_SECRET` needs to actually be set in the Vercel project's environment
  variables for the cron route to authenticate in production — it isn't, as of this entry.
- A manually-inserted chapter dated in the past (a "how we met" backstory chapter) will now appear
  on the shelf immediately, since nothing paces reveal against monthsaries any more — flagged in
  `reading-experience.md` as a real tradeoff, not an oversight, since it wasn't asked for either way.
- If `ensureCurrentMonthChapter()` ever needs to backfill a missed month (cron didn't fire), it only
  ever creates *this* calendar month's row — there's no "catch up on skipped months" logic. Nobody
  asked for that; flag if a missed cron run in production turns out to matter.
