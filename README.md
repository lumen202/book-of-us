# The Book of Us

A private, password-protected relationship archive built as a gift for two people — not a generic
gallery app. Content is organized into monthly "chapters," each holding "memories" (photos,
videos, audio, letters, milestones, and more), plus a shared bucket list of promises that turn
into memories once kept, a private vault for anything meant to stay just between the two of you,
and a "Celebration Mode" that changes the whole app's atmosphere on the 5th of every month.

**[View the live demo →](https://book-of-us-chi.vercel.app/demo)** — a frictionless, read/write
sandbox seeded with placeholder content. No account needed.

## Highlights

- **Monthly chapters** of photos and other media, laid out like pages in a physical photo album —
  prints mounted at a slight tilt, lifted on hover, opened one at a time.
- **A shared bucket list** of promises to keep together. Completing one converts it into a real
  memory, and a kept promise can hold a whole album of photos, not just one.
- **A private vault**, gated behind a password re-entry step, for anything that shouldn't live in
  the main book.
- **Celebration Mode** — every 5th of the month, the whole app shifts into a distinct atmosphere: a
  night-garden backdrop, a look-back slideshow of the month just finished, and a small firework of
  its own.
- **Soft delete everywhere.** Nothing is ever silently gone — removed items land in an admin-only
  archive and can be restored, with exactly one deliberately gated exception for permanently
  emptying the trash.
- **A fully isolated public demo**, sharing one Supabase project with the real data but walled off
  by a separate Postgres schema and separate storage buckets, so a demo visit can never read or
  write anything real.

## Stack

Next.js (App Router) + TypeScript + React 19, Tailwind CSS v4, Supabase (Postgres + Auth +
Storage) with row-level security throughout, Framer Motion. Deployed on Vercel.

> This repo intentionally tracks a very recent Next.js release, ahead of most public
> documentation and training data — see `AGENTS.md` before assuming an API's shape has stayed the
> same.

## Running it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll need a Supabase project of your own —
copy `.env.local.example` to `.env.local` and fill in the values from your project's API settings,
then, in order:

1. Run every file in `supabase/migrations/` against your project's SQL editor, in filename order
   (`0001` → `0011`).
2. Run `supabase/functions/get_chapter_memories.sql` and, if you also want a working `/demo`,
   `get_chapter_memories_demo.sql`.
3. Create the two real accounts directly in the Supabase dashboard (Authentication → Users) —
   there's no signup flow by design.
4. Optional: seed the demo schema with placeholder content —
   `npx tsx --env-file=.env.local scripts/seed-demo.ts` — after also adding `demo` to
   **Project Settings → API → Data API Settings → Exposed schemas**.

## Project structure

```
app/          Next.js routes — (auth) outside the login gate, (app) behind it
lib/          All domain logic: data access, mutations, media pipeline, theming, timeline stats
components/   Presentational React components, grouped by domain
supabase/     SQL migrations and Postgres functions (RPCs)
docs/agent/   A living internal doc set (orientation, session log, bug tracker) this project's
              development has been using across sessions
```

See `docs/agent/codebase-map/INDEX.md` for a deeper tour of any specific subsystem.
