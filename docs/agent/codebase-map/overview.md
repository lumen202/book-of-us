# Overview

A private, password-protected relationship archive for two people ("The Book of Us"). Content is
organized into monthly "chapters," each containing "memories" (photos, videos, audio, letters,
milestones, etc.). Product/design rationale lives in `docs/ARCHITECTURE.md`; the original build
plan is at `/Users/macbookpro/.claude/plans/distributed-moseying-book.md`.

## Stack

Next.js (App Router) + TypeScript + React 19, Tailwind CSS v4 (CSS-first config — theme lives in
`app/globals.css` under `@theme`, there is no `tailwind.config.ts`), Supabase (Postgres + Auth +
Storage), Framer Motion. Deployed to Vercel.

**This repo runs a bleeding-edge Next.js version with breaking changes vs. older training-data
knowledge.** See the warning block at the top of `AGENTS.md` before assuming API shapes; check
`node_modules/next/dist/docs/` if something doesn't behave as expected.

## Top-level layout

```
app/                  Next.js App Router — routes and layouts only, minimal logic
  (auth)/             Login route, outside the auth gate
  (app)/              Everything behind Supabase auth (see proxy.ts)
  auth/callback/       Supabase auth callback route handler
lib/                  All bespoke domain logic — the actual custom "framework" of this product.
                       Pages compose these modules; logic is never duplicated per-page.
  supabase/           Client/server Supabase instances
  memories/           Data access for chapters/memories — always via the get_chapter_memories RPC
  storage/            Signed URL generation for private Supabase Storage objects
  opening-sequence/   Generative, non-repeating cinematic opening system for the cover page
  celebration/        Date-driven "Celebration Mode" (5th of every month) theme/context
  theme/              Design tokens + ThemeProvider
  timeline/           Pure functions deriving relationship stats from memory rows
  surprises/          Weighted-random resurfacing of old memories/quotes, with cooldown
components/           Presentational React components, grouped by domain
supabase/
  migrations/         SQL schema migrations, applied in order
  functions/          Postgres functions (RPCs), e.g. get_chapter_memories
  seed.sql            Sample content for local/dev use
scripts/              Ops scripts (e.g. backup-export.ts)
docs/
  ARCHITECTURE.md     Product + technical rationale, env setup, deployment steps
  agent/              This framework
proxy.ts              Auth gate — redirects unauthenticated requests to /login (Next.js 16
                       renamed "middleware" to "proxy"; same file convention)
```

## Key invariants (don't violate these without updating this doc)

- **No raw memory reads.** All memory fetching goes through `lib/memories/queries.ts`, which
  calls the `get_chapter_memories` Postgres RPC — see `data-model.md`. That RPC is the only place
  that filters out soft-deleted rows and locked time-capsules.
- **No hard deletes, with exactly one gated exception.** Every mutable table has `deleted_at`,
  and no table has a DELETE RLS policy — the app's own role *cannot* issue a `DELETE` at all.
  The single exception is `purgeMemory()` in `lib/memories/mutations.ts`: admin-only, behind
  `requireAdmin()`, via the service-role client in `lib/supabase/admin.ts`, and it refuses to
  touch anything that hasn't been soft-deleted first. It exists because someone has to be able
  to empty the trash. **Do not add a second one** — if new code needs a hard delete, the answer
  is almost certainly a soft delete plus an entry in the admin archive. See `admin.md`.
- **Cross-cutting systems live in `lib/`, not in pages.** If a page needs to reimplement opening
  sequence / celebration / theming / timeline / surprises logic, something's wrong — extend the
  existing module instead.
- **Signed URLs only, minted server-side.** The Storage bucket is private; the service/anon key
  never reaches the client. `lib/storage/getSignedUrl.ts` is the only path to a usable media URL.
