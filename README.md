<div align="center">

# The Book of Us

**A private, password-protected relationship archive** — built as a gift for two people, not a
generic gallery app.

[![Live Demo](https://img.shields.io/badge/demo-book--of--us--chi.vercel.app-6366f1?style=flat-square)](https://book-of-us-chi.vercel.app/demo)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

[**View the live demo →**](https://book-of-us-chi.vercel.app/demo)

</div>

<br>

## What it does

Content is organized into monthly "chapters," each holding "memories" (photos, videos, audio,
letters, milestones, and more) — meant to feel like opening a physical photo album, not using
software.

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

## Try it

The [live demo](https://book-of-us-chi.vercel.app/demo) is a frictionless, read/write sandbox
seeded with placeholder content — no account needed. It's not a mock UI: it runs against the same
Supabase project as the real app, just walled off behind a separate Postgres schema and separate
storage buckets, so nothing typed there can ever reach real data.

The real app itself has no signup flow by design — the two accounts it's for are created directly
in the Supabase dashboard, not through the UI.

## Architecture

**One Supabase project, two worlds.** The real book and the public demo share a single Supabase
project but never share data — the demo reads and writes through its own `demo` schema and
`demo-memories`/`demo-vault` storage buckets, isolated by the same row-level security that guards
the real tables (see `lib/supabase/project.ts`).

**No logic outside `lib/`.** Every data access, mutation, media-pipeline, and theming rule lives in
`lib/`; components stay presentational. Nothing gets reimplemented inline in a route or component.

**Soft delete, not hard delete.** Deleting a memory, promise, or vault item never removes a row —
it moves into an admin-only archive that can restore it, with exactly one explicit, separately
gated action for permanently emptying the trash.

```
app/          Next.js routes — (auth) outside the login gate, (app) behind it
lib/          All domain logic: data access, mutations, media pipeline, theming, timeline stats
components/   Presentational React components, grouped by domain
supabase/     SQL migrations and Postgres functions (RPCs)
docs/agent/   A living internal doc set (orientation, session log, bug tracker) this project's
              development has been using across sessions
```

See `docs/agent/codebase-map/INDEX.md` for a deeper tour of any specific subsystem.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS v4 |
| Motion | Framer Motion |
| Data | Supabase (Postgres + Auth + Storage), row-level security throughout |
| Deployment | Vercel |

> This repo intentionally tracks a very recent Next.js release, ahead of most public
> documentation and training data — see `AGENTS.md` before assuming an API's shape has stayed the
> same.

## Running locally

```bash
git clone <this repo>
cd BookOfUs
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

## License

Private project — a personal gift, not published for reuse.
