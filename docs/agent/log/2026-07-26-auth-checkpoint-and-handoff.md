# 2026-07-26 — Auth checkpoint and session handoff

**Did:** Implemented the full auth layer: `lib/supabase/{client,server,middleware}.ts`, root
`middleware.ts` gating every route except `/login`, and `app/(auth)/login/page.tsx` +
`actions.ts` (Server Action login via `signInWithPassword`, no client-side Supabase call, no
signup route). Added the storage migration (`supabase/migrations/0002_storage.sql`) creating the
private `memories` bucket and its RLS policies. Added `.env.local.example`. Documented all of it
in `docs/agent/codebase-map/auth.md`.

**Why this entry exists:** the user asked to pause and write explicit continuation instructions
so they can open a new VSCode window on `~/Desktop/BookOfUs` and continue with a fresh Claude
Code session there, watching files generate directly in the editor instead of in a chat transcript.
This entry is that checkpoint — see "For the next session" below.

## For the next session

Nothing is broken or half-edited — every file written so far is complete and internally
consistent. What's genuinely not done yet, in build order (matches
`/Users/macbookpro/.claude/plans/distributed-moseying-book.md`):

1. **No live Supabase project connected yet.** `.env.local` does not exist. Before anything will
   run, either (a) the user creates a Supabase project via the dashboard, applies
   `supabase/migrations/0001_init.sql` and `0002_storage.sql` (SQL Editor or `supabase db push`),
   creates the two auth users, and fills in `.env.local`; or (b) an agent walks them through that.
   This should happen before `npm run dev` is expected to actually load data.
2. **Design tokens + `ThemeProvider`** (`lib/theme/`, `app/globals.css` `@theme` block) — not
   started. Fonts (Fraunces + Inter via `next/font/google`) are not wired into `app/layout.tsx`
   yet; it still has the scaffold's default Geist fonts.
3. **Core reading experience** (chapters list/cover, chapter detail, `MemoryGrid`/`MemoryDetail`,
   signed URL delivery via `lib/storage/getSignedUrl.ts`, `lib/memories/queries.ts` calling the
   `get_chapter_memories` RPC) — not started. `app/page.tsx` still has the raw Next.js scaffold
   content and needs to move into `app/(app)/page.tsx` behind a real `(app)/layout.tsx`.
4. Then: opening-sequence engine, Celebration Mode, timeline/stats, time-capsule UI, composer,
   seed data, surprise engine, backup script, `docs/ARCHITECTURE.md` — all still pending, see
   `docs/agent/codebase-map/INDEX.md` for per-system status and the plan file for full detail.

**To resume:** read `AGENTS.md` (auto-loaded), then `docs/agent/INDEX.md`, then this log's
`INDEX.md` (this entry is the latest), then `docs/agent/codebase-map/INDEX.md` for what's built
vs. not. Continue at step 2 above unless the user has since connected a live Supabase project, in
which case step 1 is already satisfied — check for `.env.local`'s existence (not its contents,
which are gitignored) before assuming.
