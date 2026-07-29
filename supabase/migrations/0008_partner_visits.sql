-- One row per browser session the partner (never the keeper) is seen in.
-- Append-only log rather than a counter column so the keeper can also see
-- *when* — middleware decides "new session" via a session cookie with no
-- max-age, so re-opening the app after the browser was fully closed logs a
-- new row, but navigating between pages within one sitting does not.
--
-- No delete/update policy, same as the other append-only tables — a visit
-- log that could be edited from the client wouldn't mean anything.

create table partner_visits (
  id uuid primary key default gen_random_uuid(),
  visited_at timestamptz not null default now()
);

alter table partner_visits enable row level security;

create policy partner_visits_select on partner_visits for select using (auth.uid() is not null);
create policy partner_visits_insert on partner_visits for insert with check (auth.uid() is not null);
