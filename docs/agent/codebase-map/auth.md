# Auth + Route Gating

Two pre-created Supabase Auth accounts (one per partner), email/password only — no signup route,
no magic link, no OAuth. This is intentional: the real app is gated behind exactly two known
identities, so there's nothing to self-serve.

A third identity exists alongside these two, isolated in a separate Postgres schema (`demo`) of
this *same* Supabase project: the demo account. See `demo.md` for the full picture — this file
covers the real two-account model; the demo reuses every piece of it (same login mechanics, same
middleware, same client helpers) rather than adding a parallel system, so it's mentioned here
wherever it touches these files directly.

## Files

- `lib/supabase/project.ts` — which schema (`public`/real or `demo`) the current request/browser is
  talking to, read from one cookie (`bou_project`). See `demo.md`.
- `lib/supabase/client.ts` — browser Supabase client. Only reach for this where genuine
  client-side interactivity needs it (e.g. a future upload-progress UI in the composer). Most of
  the app should not need it.
- `lib/supabase/server.ts` — server Supabase client for Server Components / Server Actions /
  Route Handlers, backed by cookies.
- `lib/supabase/middleware.ts` (`updateSession`) — refreshes the session on every request and
  redirects: no session + not `/login`/`/demo` → `/login` (or `/demo`, if the active project is
  demo — a demo session that's expired has no real credentials to re-enter with); has session +
  on `/login` → `/`.
- `proxy.ts` (repo root) — thin wrapper calling `updateSession`, matcher excludes static assets.
  Named `proxy.ts` (not `middleware.ts`) per the Next.js 16 rename — same file convention, the
  exported function is just called `proxy` now instead of `middleware`.
- `app/(auth)/login/page.tsx` + `actions.ts` — login form using a Server Action
  (`useActionState` + `signInWithPassword`), not a client-side fetch. No client Supabase call
  happens for login.
- `app/(auth)/demo/route.ts` — the demo's own frictionless "login". See `demo.md`.

## Creating the two accounts

Not done by the app — create both users directly in the Supabase dashboard (Authentication ->
Users -> Add user), or via the Supabase CLI. Documented step-by-step in `docs/ARCHITECTURE.md`.

## Extending this later

If a "remember this device" or password-reset flow is ever added, it still shouldn't add a
signup path — keep the two-account model. A password reset would need an
`app/auth/callback/route.ts` handler (not currently present, deliberately omitted since nothing
uses it yet) to exchange the reset-link code for a session.
