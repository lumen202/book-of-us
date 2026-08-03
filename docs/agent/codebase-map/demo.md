# The Demo Account

A frictionless, fully isolated demo — safe to hand the `/demo` link to anyone. **Second pass on
this feature**: the first version used a second, completely separate Supabase project. That turned
out not to be an option (account/billing constraint — creating a new project wasn't available), so
this was re-scoped to the design below. A fixture-data swap was considered too and rejected: with
~15 data-fetching functions across `lib/*/queries.ts`, a single missed one would leak real content
to a demo viewer, and there'd be no way to prove that risk gone by construction.

**Confirmed approach: the same Supabase project, isolated by a separate Postgres schema** (`demo`
alongside `public`) plus separate storage buckets (`demo-memories`/`demo-vault`, since Storage
buckets are project-wide and don't reach into Postgres schemas). This gives the exact same hard
isolation guarantee a second project would: a client opened with `db.schema: "demo"` cannot
construct a query against `public.*` no matter what code runs against it — the schema boundary is
enforced by Postgres/PostgREST itself, not by application-level filtering that a future edit could
accidentally weaken.

## Why this shape works with almost no code

Every `queries.ts`/`mutations.ts` file under `lib/` already goes through exactly a handful of
functions — `lib/supabase/server.ts` and `client.ts`'s `createClient()`, `lib/supabase/admin.ts`'s
`createAdminClient()`, and `middleware.ts`'s own client construction — to get a Supabase client,
and none of them took a schema argument before this. Making *those* read one cookie and pass
`db.schema` accordingly means the entire app became demo-capable with no changes to any individual
query, mutation, component, or page. Same reasoning that made the bucket-list album feature reuse
the chapter's rich grid instead of a parallel one (`bucket-list.md`) — centralize once, branch in
one place, everything downstream stays untouched.

The one place this centralization doesn't reach is Storage: a bucket name isn't part of a
Postgres schema, so the six call sites that used to hardcode `"memories"`/`"vault"` each resolve a
bucket name via `resolveBucketName(project, "memories" | "vault")`
(`lib/media/uploadMemoryMedia.ts`, `lib/vault/uploadVaultMedia.ts`, `lib/storage/getSignedUrl.ts`,
`lib/vault/getVaultSignedUrl.ts`, `lib/memories/mutations.ts`'s `purgeMemory`,
`lib/vault/mutations.ts`'s `purgeVaultItem`).

## How a visit works

1. Visiting `/demo` (`app/(auth)/demo/route.ts`) signs in server-side with
   `DEMO_ACCOUNT_EMAIL`/`DEMO_ACCOUNT_PASSWORD` (server-only, never reach the client) against the
   *same* project's URL/anon key, opened with `db.schema: "demo"` — there's no form, no
   credentials to hand out. Sets `bou_project=demo`, redirects to `/`. Auth itself is unaffected by
   the schema split: `auth.users` is global, so this is the same `signInWithPassword` call the real
   login uses, just a third row in the same table.
2. From then on, every Supabase client the app builds — `lib/supabase/server.ts`, `client.ts`
   (browser-side, via `resolveProjectFromDocumentCookie`), `middleware.ts`, and
   `lib/supabase/admin.ts`'s `createAdminClient(schema)` for the two admin-only paths that need
   it — reads `bou_project` (`lib/supabase/project.ts`'s `resolveProject`/`resolveSchema`) and opens
   with `db.schema: "demo"` instead of `"public"`. Everything the demo visitor does (browsing
   chapters, the bucket list, the vault, even the keeper pages) reads and writes only `demo.*`
   tables and the `demo-memories`/`demo-vault` buckets.
3. Postgres functions are schema-scoped too: `supabase/functions/get_chapter_memories_demo.sql`
   defines `demo.get_chapter_memories`, `demo.get_all_memories`, etc. — identically named to their
   `public` counterparts, querying `demo.*` tables instead. A `db.schema: "demo"` client's `.rpc()`
   calls resolve against these automatically; `lib/*/queries.ts` never needs to know which schema
   it's talking to.
4. A real session and a demo session share the same `@supabase/ssr` session cookie name (same
   project URL now, unlike the first version) — `bou_project` is what actually decides which
   schema a request's client opens with, not an inference from which Supabase cookies are present.
5. `signOut` (`app/(app)/actions.ts`) clears `bou_project` alongside the real Supabase sign-out, so
   a demo visit doesn't leave the browser routed to `demo` afterward.

## Keeper access

The demo account is the keeper. `lib/auth/admin.ts`'s `isAdminEmail` is a plain string match with
no schema awareness — `ADMIN_USERNAMES` lists both the real keeper's username and the demo
account's (`"demo"`). **If `ADMIN_EMAILS` (the full-address override) is ever configured, the demo
account's email needs adding to it too**, or the demo silently loses its keeper view — that env
var overrides the hardcoded list entirely.

## Setting up the demo schema from scratch

1. Run `supabase/migrations/0011_demo_schema.sql` against the (one, shared) project — it creates
   the `demo` schema and every table from `0001`–`0010` again under it, plus the
   `demo-memories`/`demo-vault` storage buckets and their RLS policies. Then run every function in
   `supabase/functions/get_chapter_memories_demo.sql` (`create or replace` makes this safe
   regardless of order).
2. **The one manual, non-SQL step**: Supabase's Data API only serves schemas explicitly listed
   under Project Settings → API → Data API Settings → Exposed schemas. `public` is there by
   default; `demo` has to be added by hand after step 1 creates it, or every PostgREST call against
   it will 404/permission-error even though the schema and tables exist.
3. Set `DEMO_ACCOUNT_EMAIL`/`DEMO_ACCOUNT_PASSWORD` in `.env.local` (and in Vercel for the deployed
   app) — pick anything; this is what `/demo` signs in with and what `scripts/seed-demo.ts` creates
   the matching auth user as. No separate URL/anon-key pair is needed anymore — the demo shares
   `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` with the real account.
4. Run the seed script once (see the script's own header for the exact env shape):
   ```
   npx tsx --env-file=.env.local scripts/seed-demo.ts
   ```
   Creates the demo auth user, a fake `relationship`, a few chapters of placeholder photos
   (sourced from Lorem Picsum at request time — no local image pipeline needed), a bucket list
   exercising every state the UI branches on (open, open-with-reference-photo,
   kept-with-just-a-cover, kept-with-a-multi-photo-album), a couple of vault items, and one
   soft-deleted memory + one soft-deleted promise so the keeper archive has something to
   demonstrate restoring/purging. Safe to re-run — every insert is guarded, a second run adds
   nothing new. Builds its own service-role client directly (not
   `lib/supabase/admin.ts`'s `createAdminClient`) because that file has `import "server-only"` at
   the top, which throws outside the Next.js server runtime — a standalone `tsx` script isn't part
   of that.
5. Visit `/demo`.

## Deliberately not done

- **No separate deployment or Supabase project.** One Vercel project, one Supabase project, serves
  both the real app and the demo — routed by `bou_project` deciding which Postgres schema a
  request's client opens with. Simpler than standing up either a second deployment or a second
  project, and the real app's behavior is provably unchanged (same code path, `"public"` schema,
  with the cookie absent or anything other than `"demo"`).
- **No password/credential UI for the demo.** Frictionless was the explicit ask; the login page
  just links to `/demo` rather than offering a form. If a "realistic login" demo is ever wanted
  instead, the pieces are already here (`DEMO_ACCOUNT_EMAIL`/`PASSWORD`) — it'd just mean building
  a form that posts to a version of `/demo` instead of auto-signing-in on `GET`.
- **No richer seed content than one pass of `seed-demo.ts` produces.** If the demo needs updating
  (more months, different promises), edit the script and re-run — it's the source of truth, not
  something to hand-edit via the dashboard.
