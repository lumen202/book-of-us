# 2026-08-03 — A frictionless, isolated demo account

Picked back up from earlier today: user wants a demo safe to hand to anyone, seeing the full
keeper experience, never touching real data. Re-scoped the alternatives one more time before
building (a shared-database multi-tenancy model would have touched all 9 tables and every RLS
policy/query file; a fixture-data swap risked a missed data-fetching path leaking real content) —
confirmed a second, fully separate Supabase project, entered via a dedicated `/demo` link,
frictionless (no credentials to hand out), seeded with placeholder content.

## The key insight

Every query/mutation file under `lib/` already gets its Supabase client from exactly two
functions — `lib/supabase/server.ts`/`client.ts`'s `createClient()`. Making *those two* (plus
`lib/supabase/middleware.ts`'s own client) read one new cookie (`bou_project`) and pick real-vs-
demo env vars accordingly meant the entire app became demo-capable with zero changes to any
individual page, component, query, or mutation — the exact same "centralize once, branch in one
place" reasoning that made the bucket-list album reuse the chapter's grid instead of a parallel
one, earlier today.

## What shipped

- `lib/supabase/project.ts` (new): `ACTIVE_PROJECT_COOKIE`, `resolveProject`,
  `resolveProjectConfig` — the one place "which project" is decided.
- `lib/supabase/server.ts`, `client.ts`, `middleware.ts`: read the cookie, pick project env vars.
  `middleware.ts` also treats `/demo` as public (like `/login`) and redirects an expired demo
  session back to `/demo` rather than the real login form, which it has no credentials for.
- `app/(auth)/demo/route.ts` (new): the whole "login" — signs in against the demo project with
  server-only credentials, sets `bou_project=demo`, redirects to `/`.
- `app/(app)/actions.ts`'s `signOut`: also clears `bou_project`.
- `lib/auth/admin.ts`: demo account added to `ADMIN_USERNAMES` (keeper access) — flagged that
  `ADMIN_EMAILS`, if ever configured, would need the demo email added too, since it overrides the
  hardcoded list entirely.
- `scripts/seed-demo.ts` (new, first script in a `scripts/` dir — added `tsx` as a dev dependency
  to run it): fake relationship, a few chapters of placeholder photos (Lorem Picsum, sized via URL
  params — no local downscale pipeline needed for placeholder content), a bucket list exercising
  every UI state (open, open-with-reference-photo, kept-with-cover, kept-with-a-multi-photo
  album), vault items, and one soft-deleted memory + promise so the keeper archive has something
  to demonstrate. Idempotent — safe to re-run.
- `.env.local.example`: documented the four new env vars.
- New `docs/agent/codebase-map/demo.md`; `auth.md` updated in place to point at it.

## Not yet done (this one genuinely can't be finished from here)

Provisioning the actual second Supabase project, running every migration/RPC there, setting the
new env vars in Vercel, and running the seed script all need the user directly — this isn't a SQL
paste like every other outstanding item today, it's account/billing-level project creation.
`demo.md` has the full step-by-step. Until that's done, `/demo` returns a 503 ("not set up yet")
rather than erroring, by design (`resolveProjectConfig` falls back to the real project's config if
the demo env vars are absent, and the route itself checks for all four before attempting
sign-in).
