# Data Model

Source of truth: `supabase/migrations/0001_init.sql`. This file explains the *why*; read the
migration for exact column types.

## Tables

- **`relationship`** — singleton settings row (`started_at`, partner names, `settings jsonb`).
  Enforced to at most one row via a boolean primary key + check constraint, not application logic.
- **`chapters`** — one per month (`slug`, `title`, `month` date, `atmosphere jsonb` for
  per-chapter theming, optional `cover_memory_id`).
- **`memories`** — every photo, video, voice note, letter, chat screenshot, song, location,
  milestone, or small text moment. A single table with a `type` check constraint
  (`photo|video|audio|letter|chat|song|location|milestone|text`) rather than one table per type.

**Why one `memories` table instead of per-type tables:** chapter and timeline queries would
otherwise need a `UNION` across 5+ tables, which fights the "fetch per chapter, scale to
thousands of rows over decades" goal. Type-specific fields (image width/height, video/audio
duration, song artist, location city/country) are sparse and optional, so they live in a `meta
jsonb` column instead of mostly-null dedicated columns. Milestones are `type = 'milestone'` rows
in the same table for the same reason — they need the same chapter/date/soft-delete plumbing as
everything else.

**`unlock_at`** on `memories` makes *any* memory a potential time capsule, not just letters —
see `time-capsules.md`.

- **`memory_reactions`** — emoji reactions on memories, one row per `(memory_id, user_id)` (that
  pair is the primary key). Not time-capsule-gated content, so `lib/reactions/queries.ts` reads
  the table directly rather than through an RPC — the "no raw memory reads" rule below is scoped
  to `memories` itself. See `reading-experience.md` for the UI.

## Soft delete

Every mutable table has `deleted_at timestamptz`. The app never issues `DELETE`. RLS has no
delete policy on any table, so a normal authenticated connection literally cannot delete a row —
only a service-role connection could (used solely by `scripts/backup-export.ts`'s tooling, not
by the running app). `memory_reactions` follows the same rule: "un-reacting" stamps `deleted_at`
rather than deleting the row, and reacting again upserts on the primary key, clearing it.

## RLS

RLS is enabled on all four tables. Every table has the same shape: `select`/`insert`/`update`
policies all just check `auth.uid() is not null` — this is a shared two-person book, not
per-user-owned data, so there's no per-row ownership split.

## Time-capsule enforcement is NOT an RLS concern

RLS can't cleanly express "hidden until date X, relative to `now()`" as a reusable policy. Instead:

- `supabase/functions/get_chapter_memories.sql` defines `get_chapter_memories(p_chapter_id uuid)`,
  a SQL function that filters `deleted_at is null and (unlock_at is null or unlock_at <= now())`.
- `lib/memories/queries.ts` is the **only** code path allowed to read memories, and it always
  calls this RPC — never `.from('memories').select()` directly. A raw table query would still be
  blocked from returning *other people's* data by RLS, but would leak locked/deleted content to
  the two legitimate users, which defeats the point of a time capsule.

If you add a new way to read memories (e.g. a search feature, an export tool), it must go through
the same RPC pattern or a new RPC with equivalent filtering — never a raw select.
