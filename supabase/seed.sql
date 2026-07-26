-- Sample content for local/dev review only — throwaway, meant to be replaced
-- via the composer (build plan step 10) once it exists. Safe to re-run after
-- a `truncate` if you want a clean slate; slugs are unique so re-running
-- as-is will error on conflict rather than duplicate rows.
--
-- Includes one locked time-capsule memory (unlock_at in the far future) to
-- demonstrate that get_chapter_memories correctly omits it from results.

insert into relationship (started_at, partner_a_name, partner_b_name)
values ('2026-07-05', 'Joshua', 'Liezel');

insert into chapters (slug, title, month, atmosphere) values
  ('where-it-began', 'Where It Began', '2026-01-01', '{}'),
  ('little-routines', 'Little Routines', '2026-04-01', '{}'),
  ('this-month', 'This Month', '2026-07-01', '{}');

insert into memories (chapter_id, type, title, body, occurred_at, meta)
select id, 'milestone', 'First "I love you"', 'Said it first, out loud, no take-backs.', '2026-01-12', '{}'
from chapters where slug = 'where-it-began';

insert into memories (chapter_id, type, title, body, occurred_at, meta)
select id, 'text', 'Rainy Tuesday', 'Stayed in, made soup, watched three movies back to back.', '2026-01-20', '{}'
from chapters where slug = 'where-it-began';

insert into memories (chapter_id, type, title, body, occurred_at, meta)
select id, 'letter', 'A note for a normal day', 'Nothing special happened today, and that''s exactly why I wanted to write this down.', '2026-04-08', '{}'
from chapters where slug = 'little-routines';

insert into memories (chapter_id, type, title, body, occurred_at, meta)
select id, 'milestone', 'Adopted a plant we somehow kept alive', 'A small, ongoing miracle.', '2026-04-22', '{}'
from chapters where slug = 'little-routines';

insert into memories (chapter_id, type, title, body, occurred_at, meta)
select id, 'text', 'Grocery run that turned into a whole afternoon', 'We just kept talking in the parking lot.', '2026-07-03', '{}'
from chapters where slug = 'this-month';

-- Locked time capsule: unlock_at is in the future, so get_chapter_memories
-- (and get_all_memories) will not return this row until then.
insert into memories (chapter_id, type, title, body, occurred_at, unlock_at, meta)
select id, 'letter', 'Open this one later', 'Sealed for a future version of us to read.', '2026-07-15', '2027-01-01T00:00:00Z', '{}'
from chapters where slug = 'this-month';
