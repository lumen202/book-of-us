-- Sample content for local/dev review only — throwaway, meant to be replaced
-- via the composer (build plan step 10) once it exists. Safe to re-run after
-- a `truncate` if you want a clean slate; slugs are unique so re-running
-- as-is will error on conflict rather than duplicate rows.
--
-- Chapters are dated (not narratively titled) and start the month the
-- relationship itself started — chapter one is 2026-06 (relationship.started_at
-- is 2026-06-05), visible from day one. Later chapters unlock one per
-- monthsary after that: 2026-07 on 2026-07-05, 2026-08 on 2026-08-05, and so
-- on (see lib/relationship/nextChapter.ts + lib/chapters/queries.ts). Only
-- the chapter that already exists is seeded here — future months are added
-- for real when they're written, not pre-seeded speculatively.
--
-- Includes one locked time-capsule memory (unlock_at in the far future) to
-- demonstrate that get_chapter_memories correctly omits it from results.

insert into relationship (started_at, partner_a_name, partner_b_name)
values ('2026-06-05', 'Joshua', 'Liezel');

insert into chapters (slug, title, month, atmosphere) values
  ('2026-06', 'June 2026', '2026-06-01', '{}');

insert into memories (chapter_id, type, title, body, occurred_at, meta)
select id, 'milestone', 'First "I love you"', 'Said it first, out loud, no take-backs.', '2026-06-06', '{}'
from chapters where slug = '2026-06';

insert into memories (chapter_id, type, title, body, occurred_at, meta)
select id, 'text', 'Rainy Tuesday', 'Stayed in, made soup, watched three movies back to back.', '2026-06-20', '{}'
from chapters where slug = '2026-06';

-- Locked time capsule: unlock_at is in the future, so get_chapter_memories
-- (and get_all_memories) will not return this row until then.
insert into memories (chapter_id, type, title, body, occurred_at, unlock_at, meta)
select id, 'letter', 'Open this one later', 'Sealed for a future version of us to read.', '2026-06-15', '2027-01-01T00:00:00Z', '{}'
from chapters where slug = '2026-06';
