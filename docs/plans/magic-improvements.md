# Plan: Magic Improvements

Compiled 2026-08-06 from a full experience-layer + data-layer review. Not started — items are
ordered by magic-per-effort and are independently shippable. Each item lists the implementation
route so a future session can start without re-deriving the analysis.

**Ground rules for every item** (from `AGENTS.md` / `docs/agent/codebase-map/overview.md`):
memory reads only via the RPCs in `lib/memories/queries.ts`; time via `getAppNow()`
(`lib/relationship/devClock.ts`), never `new Date()`; logic in `lib/`, pages compose;
per-couple config goes in `relationship.settings` jsonb (no migration needed); no stat
dashboards — stats surface as sentences inside existing beats.

---

## 1. Time capsules — seal and unseal (highest leverage)

The backend is 100% built: `memories.unlock_at` exists, indexed, and `get_chapter_memories` /
`get_all_memories` already filter locked rows. Nothing writes it and nothing renders it.

- **Seal:** add a "seal this for later" option to `components/memory/MemoryComposer.tsx`
  (date picker framed as "when should this open?"; default suggestion = next monthsary via
  `getNextChapterDate`). Write `unlock_at` in `lib/memories/mutations.ts`.
- **Locked presence:** the RPCs hide locked rows entirely, so add one small companion query
  (new SQL function or a narrow select) returning only `{count, unlock_at}` of locked rows per
  chapter — never content. Render as a wax-sealed envelope print in the album grid:
  "opens on the 5th of December."
- **Unseal:** when a visit lands after `unlock_at`, the envelope is tappable and breaks open,
  reusing the seal-break + letter-unfold motion from
  `lib/opening-sequence/sequences/MonthsaryOpening.tsx`.
- Docs: create `docs/agent/codebase-map/time-capsules.md`, flip the INDEX row to `current`.

## 2. `lib/surprises/` — an "on this day / from the book" arrival beat

Only the 5th has an opening; ordinary days go straight to the shelf. Build the
documented-but-nonexistent `lib/surprises/`:

- Weighted random pick over `getAllMemories()` (currently has **zero callers**). Weight up
  same-day-of-month anniversaries of `occurred_at`; weight down recently resurfaced items.
- Cooldown/recently-shown state in `relationship.settings.surprises` (per role).
- Surface as a single loose print resting above the shelf on `app/(app)/page.tsx` —
  "this slipped out of the book" — not a widget. Appear only ~1 visit in 3; unpredictability
  is the point.
- Docs: create `docs/agent/codebase-map/surprises.md`, flip the INDEX row.

## 3. "While you were away" — traces of the other person

- Compare partner reactions/comments `created_at` against the viewer's previous
  `partner_visits` timestamp (full log already stored; only count+latest is read today).
- On arrival: one quiet line — "She left a note on one of the pictures while you were away" —
  linking to that memory.
- If both partners opened the book the same day, say so in
  `components/story/ClosingReflection.tsx` (keep it CTA-free).
- Needs a small read path for "my own last visit" (visits are currently keeper-only and
  partner-only-logged; keeper visits aren't logged at all — decide whether to log both roles).

## 4. Letters and songs become physical objects in the album

`albumPrints()` (`lib/memories/queries.ts` ~line 131) filters to `type === "photo"` only; the
schema supports 9 types.

- `letter`: a folded cream note between the prints; unfolds on lift reusing the ceremony
  letter's ink-fade treatment.
- `song`: a ticket-stub / handwritten title + artist card (meta jsonb already has fields).
- Composer grows exactly one gentle option ("tuck in a note") — resist metadata fields.
- Start with `letter` only; others follow the same pattern later.

## 5. The garden knows things without being told

- **Auto-season (quick fix, do first):** `CURRENT_SEASON` in `lib/theme/tokens.ts` is
  hand-edited and will silently go stale. Derive from `getAppNow()` month → amihan/tag-init/
  tag-ulan ranges. Keep a manual override slot.
- **Real dusk:** evening hours drift the sky toward the existing night look (reuse the
  `data-night-preview` machinery with a softer intermediate state). Celebration night always
  wins.
- **Data-reactive details (small, unlabeled, discovered):** e.g. one extra firefly per kept
  promise (`bucket_list_items.completed_at`), swing occupied on the monthsary.

## 6. Sound + haptics — a whispered, opt-in layer

Currently the entire app is silent (no audio, no `navigator.vibrate` anywhere).

- Tiny palette: paper slide (letter unfold), soft crack (wax seal), distant pop (heart
  firework), faint page brush (chapter open). Short files, lazy-loaded, quiet by default.
- Haptics: single light `navigator.vibrate` taps on seal-break and print-lift (mobile only).
- Opt-in with persistent mute in `relationship.settings`; fully silent under reduced motion.

## 7. Stats as sentences, not screens

Days together (`started_at` + existing date math), promises kept this year, photos in the
book — all cheap derivations (build the documented-but-missing `lib/timeline/` pure functions).
Surface as one rotating line inside `ClosingReflection` or the ceremony whispers
("437 days, and counting"). Never a grid.

## 8. Vault ceremony

The vault (`components/vault/`) is functional but un-theatrical next to everything else.
Give `VaultGate` an entrance beat — a drawer/lockbox opening on successful password — and
`VaultCard` a small reveal treatment consistent with the album prints.

---

## Housekeeping (found during the review, fix opportunistically)

- Stale references to a deleted `docs/plans/` tree in `reading-experience.md` and
  `data-model.md` (this file re-establishes the directory — repoint or prune the stale links).
- `overview.md` describes `lib/surprises/` and `lib/timeline/` as existing; they don't.
  Items 2 and 7 above build them — until then the doc overstates reality.
- BUG-005 is "fixed, unverified"; parallax is disabled everywhere, so the scroll-depth effect
  described in `painted-world.md` is dormant — verify perf and either re-enable or update the doc.
- No test files exist anywhere in the repo. At minimum, unit-test the pure date/derivation
  logic (`monthsary.ts`, `nextChapter.ts`, future `lib/timeline/`, `lib/surprises/` weighting)
  — these are the functions whose silent breakage would ruin a ceremony date.
