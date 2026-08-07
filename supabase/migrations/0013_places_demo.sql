-- Places, mirrored into the demo schema — same shape as 0011_demo_schema.sql
-- did for everything through 0010. See docs/agent/codebase-map/demo.md: a
-- `db.schema: "demo"` client resolves `place_saves`/`place_shown_log`
-- automatically once these exist, no application code changes needed.

create table demo.place_saves (
  place_slug text not null,
  user_id uuid not null references auth.users (id),
  list text not null check (list in ('wishlist', 'visited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (place_slug, user_id, list)
);

create index demo_place_saves_list_idx on demo.place_saves (list) where deleted_at is null;

create trigger place_saves_set_updated_at
  before update on demo.place_saves
  for each row execute function set_updated_at();

alter table demo.place_saves enable row level security;

create policy place_saves_select on demo.place_saves for select using (auth.uid() is not null);
create policy place_saves_insert on demo.place_saves for insert with check (auth.uid() is not null);
create policy place_saves_update on demo.place_saves for update using (auth.uid() is not null) with check (auth.uid() is not null);

create table demo.place_shown_log (
  id uuid primary key default gen_random_uuid(),
  place_slug text not null,
  user_id uuid not null references auth.users (id),
  source text not null check (
    source in ('surprise', 'wheel', 'lucky-draw', 'daily-pick', 'weekend-escape', 'hidden-gem', 'view')
  ),
  shown_at timestamptz not null default now()
);

create index demo_place_shown_log_user_shown_at_idx on demo.place_shown_log (user_id, shown_at desc);
create index demo_place_shown_log_slug_idx on demo.place_shown_log (place_slug);

alter table demo.place_shown_log enable row level security;

create policy place_shown_log_select on demo.place_shown_log for select using (auth.uid() is not null);
create policy place_shown_log_insert on demo.place_shown_log for insert with check (auth.uid() is not null);
