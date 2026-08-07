-- Places — the destination-discovery feature. Everything about *what a place
-- is* (name, images, description, coordinates) lives in the codebase, not
-- here — see lib/places/data/ and docs/agent/codebase-map/places.md. This
-- migration only stores what the two of you *do* with a place: save it,
-- mark it visited, and a log of what's already been surfaced so the
-- randomiser doesn't repeat itself. `place_slug` is a plain text FK-by-
-- convention into that static dataset (there's no `places` table to
-- reference — content that changes by editing a TS file, not a row).
--
-- Same shape as every other table in this schema: shared two-person data
-- (any signed-in account can read and write all of it, same as
-- memory_reactions/comments/bucket_list_items), no hard deletes, RLS with no
-- delete policy — see the "no hard deletes" invariant in
-- docs/agent/codebase-map/overview.md.

-- ---------------------------------------------------------------------------
-- place_saves: a wishlist ("want to go") or a visited mark, per place.
-- Toggled and un-toggled freely — same soft-delete-and-upsert pattern as
-- memory_reactions: "removing" a save stamps deleted_at, saving again clears
-- it via upsert on the primary key rather than a second row.
-- ---------------------------------------------------------------------------
create table place_saves (
  place_slug text not null,
  user_id uuid not null references auth.users (id),
  list text not null check (list in ('wishlist', 'visited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (place_slug, user_id, list)
);

create index place_saves_list_idx on place_saves (list) where deleted_at is null;

create trigger place_saves_set_updated_at
  before update on place_saves
  for each row execute function set_updated_at();

alter table place_saves enable row level security;

create policy place_saves_select on place_saves for select using (auth.uid() is not null);
create policy place_saves_insert on place_saves for insert with check (auth.uid() is not null);
create policy place_saves_update on place_saves for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- place_shown_log: append-only record of every place either of you has been
-- shown by a discovery surface (Surprise Me, the wheel, a lucky-draw card,
-- the Daily Pick, Weekend Escape, Hidden Gem mode) or opened directly.
-- `lib/places/engine.ts` reads recent rows to weight the random pick away
-- from repeats — see the doc comment there for the actual algorithm. No
-- delete/update policy, same as partner_visits: a shown-log that could be
-- edited from the client wouldn't mean anything as a "don't repeat this"
-- signal.
-- ---------------------------------------------------------------------------
create table place_shown_log (
  id uuid primary key default gen_random_uuid(),
  place_slug text not null,
  user_id uuid not null references auth.users (id),
  source text not null check (
    source in ('surprise', 'wheel', 'lucky-draw', 'daily-pick', 'weekend-escape', 'hidden-gem', 'view')
  ),
  shown_at timestamptz not null default now()
);

create index place_shown_log_user_shown_at_idx on place_shown_log (user_id, shown_at desc);
create index place_shown_log_slug_idx on place_shown_log (place_slug);

alter table place_shown_log enable row level security;

create policy place_shown_log_select on place_shown_log for select using (auth.uid() is not null);
create policy place_shown_log_insert on place_shown_log for insert with check (auth.uid() is not null);
