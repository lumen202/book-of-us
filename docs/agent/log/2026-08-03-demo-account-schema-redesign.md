# Demo account, take two: same Supabase project, separate schema

Follow-up to [`2026-08-03-demo-account.md`](2026-08-03-demo-account.md), which built the demo
account as a second, fully separate Supabase project. That version is complete and working in
isolation, but the separate-project premise turned out to be wrong: creating a new Supabase
project isn't available on the account (billing/plan constraint), so a live demo could never
actually be set up on top of it.

## What changed

Re-scoped to: the *same* Supabase project, isolated by a separate Postgres schema (`demo`
alongside `public`) instead of a separate project, plus separate storage buckets
(`demo-memories`/`demo-vault`, since Storage buckets don't live inside a Postgres schema). This
gives the identical hard-isolation guarantee a second project would — a client opened with
`db.schema: "demo"` cannot construct a query against `public.*`, full stop — without needing a new
project. A fixture-data-swap alternative was considered and rejected first: with ~15
data-fetching functions across `lib/*/queries.ts`, one missed swap would leak real content, and
there'd be no way to prove that risk gone by construction the way a schema boundary can be.

Concretely:

- `lib/supabase/project.ts` now resolves a **schema** (`"public" | "demo"`), not a different
  project URL/key — both share `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`. New
  `resolveBucketName(project, "memories" | "vault")` for the bucket-name half of the split, since
  that part *isn't* schema-scoped.
- `server.ts`/`client.ts`/`middleware.ts` now pass `db: { schema }` instead of swapping which
  project's URL/key they use. New `lib/supabase/project.server.ts` (`getActiveProjectFromCookies`)
  for the handful of callers with no cookie store of their own.
- `lib/supabase/admin.ts`'s `createAdminClient` gained an optional `schema` param (default
  `"public"`), used by `purgeMemory`/`purgeVaultItem` (each now also resolves a bucket name) and by
  `scripts/seed-demo.ts`.
- New `supabase/migrations/0011_demo_schema.sql`: every table from `0001`–`0010`, recreated
  verbatim under `demo.` — same columns/constraints/indexes/triggers/RLS shape — plus the two new
  storage buckets and their policies.
- New `supabase/functions/get_chapter_memories_demo.sql`: all five RPC functions, same names,
  recreated under `demo.` querying `demo.*` tables. Same name as the `public` versions is
  deliberate — a `db.schema: "demo"` client's `.rpc()` calls resolve to these automatically, so
  `lib/*/queries.ts` needed zero changes.
- `app/(auth)/demo/route.ts` simplified: signs in against the same project's URL/anon key with
  `db.schema: "demo"`, instead of a second project's credentials.
- `app/(auth)/login/page.tsx` gained a quiet "View demo" link — this had been floated as a nice-to-
  have in the first pass and is now in.
- `scripts/seed-demo.ts` rewritten to target `demo.*` tables / `demo-memories`/`demo-vault` in the
  *same* project, using the main `SUPABASE_SERVICE_ROLE_KEY`. Still builds its own
  `@supabase/supabase-js` client rather than importing `lib/supabase/admin.ts` — that file's
  `import "server-only"` guard throws outside the Next.js server runtime, which a standalone `tsx`
  script isn't part of.
- `.env.local.example`: dropped `NEXT_PUBLIC_DEMO_SUPABASE_URL`/`ANON_KEY` entirely; kept
  `DEMO_ACCOUNT_EMAIL`/`PASSWORD`. (Also fixed an unrelated stale comment on
  `SUPABASE_SERVICE_ROLE_KEY` that referenced a `scripts/backup-export.ts` that doesn't exist in
  this repo — noticed in passing while editing the same file.)
- `docs/agent/codebase-map/demo.md` rewritten in place for the schema model; `auth.md` updated
  where it referenced "a different Supabase project."

`npx tsc --noEmit` and `npx eslint .` both clean against these changes (eslint's remaining findings
are pre-existing issues in unrelated files — `lib/ambient/useMeteors.ts`,
`lib/navigation/useCloseOnBack.ts`, `components/vault/VaultGrid.tsx`,
`components/vault/VaultReactions.tsx`, `lib/ambient/useParallax.ts`).

## What the next session (or the user, before first use) must still do

None of this has been applied to the actual Supabase project yet — it's all local file changes.
Three manual steps before `/demo` works:

1. Run `0011_demo_schema.sql`, then every function in `get_chapter_memories_demo.sql`, against the
   real project's SQL editor.
2. **Add `demo` to Project Settings → API → Data API Settings → Exposed schemas** — Supabase's Data
   API only serves schemas explicitly listed there, `public` is default but `demo` is not, and no
   SQL migration can do this step. Skipping it means every PostgREST call against `demo.*` fails
   even though the schema and tables exist.
3. Set `DEMO_ACCOUNT_EMAIL`/`PASSWORD` in `.env.local` (and Vercel), then run
   `npx tsx --env-file=.env.local scripts/seed-demo.ts` once.

Full setup detail lives in `docs/agent/codebase-map/demo.md`, kept as a living doc rather than
repeated here.
