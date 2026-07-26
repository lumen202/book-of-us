# 2026-07-26 — Project kickoff and scaffold

**Did:** Established the project at `~/Desktop/BookOfUs/`. Scaffolded Next.js (App Router,
TypeScript, Tailwind v4, Turbopack) via `create-next-app`. Installed `@supabase/supabase-js`,
`@supabase/ssr`, and `framer-motion`. Wrote the initial schema (`supabase/migrations/0001_init.sql`)
— `relationship`, `chapters`, `memories` tables, soft delete, RLS. Set up this agent-framework doc
set (`docs/agent/`) per explicit user request, structured as small per-topic/per-entry files with
index tables rather than a few large files, specifically to keep future sessions cheap to orient
(read an index, open only what's relevant) instead of scanning accumulated history in full.

**Why:** Full architecture (schema, folder structure, build order) was designed in
`/Users/macbookpro/.claude/plans/distributed-moseying-book.md` before any code was written, and
approved by the user. Key decisions: Next.js + Supabase + Vercel (user's explicit choice); a
single flexible `memories` table with a `type` discriminator instead of one table per media type
(see `codebase-map/data-model.md`); time-capsule locking enforced server-side via a Postgres RPC
rather than RLS, because RLS can't cleanly express "hidden until date X, relative to now()."

**Watch out for:** `create-next-app` refuses capitalized package names, so the scaffold was
generated in a temp dir (`book-of-us-scaffold`) and moved into place — `package.json`'s `name`
field was manually corrected to `book-of-us` afterward. This repo pins bleeding-edge versions
(Next 16.2.12, React 19.2.4, Tailwind v4) — Tailwind v4 has no `tailwind.config.ts`; all theme
tokens live in `app/globals.css` under `@theme`. Don't reach for a classic `tailwind.config.js`
pattern from older training data. No live Supabase project exists yet at this point in the
build — migrations are written but not yet applied anywhere; env vars are not yet configured.
