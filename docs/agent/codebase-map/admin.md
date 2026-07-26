# Admin (the keeper) + permanent deletion

This is a two-person book where both accounts see and edit everything. There is exactly **one**
asymmetry: one account can empty the trash for good.

## Who is admin

`lib/auth/admin.ts`. Decided by identity, not by a schema role — there's no role column and no
reason to add one for a single capability.

- Matches the signed-in user's email **local part** (before `@`, case-insensitive) against
  `ADMIN_USERNAMES` — currently `["jdiniega202"]`. Matching the local part means the mail host
  can change without a code edit.
- `ADMIN_EMAILS` (comma-separated full addresses) overrides that list entirely when set. Use it
  in deployment rather than editing the constant.
- `isCurrentUserAdmin()` for rendering decisions; `requireAdmin()` throws and is what actually
  enforces.

**Every destructive admin action calls `requireAdmin()` itself.** A Server Action is a public
endpoint — hiding a link or a route is tidiness, not access control. The checks are deliberately
redundant (action *and* `purgeMemory` internally); don't "clean that up".

## The archive route

`app/(app)/archive/` — lists soft-deleted memories, newest removal first.

- Non-admins get `notFound()`, not a permission error. There's no reason for the other partner to
  learn there's a page they can't open.
- `listDeletedMemories()` in `lib/memories/queries.ts` is the one memory read that hits the table
  directly rather than the `get_chapter_memories` RPC — that RPC exists precisely to *exclude*
  these rows, so it can't be asked for them. Still RLS-protected, still inside `queries.ts`, so
  the "memory reads live in one file" invariant holds.
- `components/archive/ArchiveList.tsx` — **Put back** is the prominent action and **Delete
  forever** is the quiet one, inverted from how the row would naturally read. The common reason
  to open this page is regret.
- Styled as maintenance, not as part of the reading experience. Dressing a destructive screen up
  as a keepsake would make it feel gentler than it is.

## Permanent deletion

`purgeMemory()` in `lib/memories/mutations.ts` — the documented exception to the no-hard-deletes
invariant (see `overview.md`).

- Uses `lib/supabase/admin.ts`, the service-role client, which **bypasses RLS**. That file is
  marked `server-only`, so an accidental client import is a build error rather than a leaked key.
  Import it only from a Server Action that has already called `requireAdmin()`.
- **Refuses to purge a row that isn't already soft-deleted.** Deletion is always two separate,
  deliberate steps.
- Order is storage objects first, then the row. If the storage call fails the row survives and
  the operation is retryable; the other order would strand orphan files in the bucket.
- Requires `SUPABASE_SERVICE_ROLE_KEY`. Without it the function throws a clear message and
  nothing else in the app is affected.

## Related

- `overview.md` — the invariant and its one exception.
- `data-model.md` — why there is no DELETE policy on any table.
