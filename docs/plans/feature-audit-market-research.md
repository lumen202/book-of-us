# Feature Audit — External Research

Compiled 2026-08-13. Scope: what comparable products (couples apps, memory-keeping apps,
nostalgia/resurfacing apps, travel-timeline apps) do, filtered through this project's identity —
a private two-person archive, not a utility app — to decide what's actually worth borrowing.
Complements [`magic-improvements.md`](magic-improvements.md), which is an internal experience-layer
review of what's already half-built; this file starts from what the market does and cross-checks
it against this repo. Read both before picking up new feature work.

**Ground rules carried over** (from `AGENTS.md` / `docs/agent/codebase-map/overview.md`): no stat
dashboards — stats surface as sentences inside existing beats; no chat/messaging layer (this is an
archive, not a communication app); no generic app patterns (grids, admin forms, gamification
streaks) unless functionally required; logic lives in `lib/`; time via `getAppNow()`.

---

## 1. What's already here

Chapters + memories (photo/video/audio/letter/milestone, 9 types in schema), bucket list
(promises → memories), a private password-gated vault, Celebration Mode (5th of month), a
generative non-repeating opening sequence, destination discovery ("Places," with a Surprise Me
wheel, Lucky Draw, Daily Pick, Weekend Escape, Hidden Gem Mode), emoji reactions + notes on
memories, soft delete with admin-only restore/purge, a public demo sandboxed via a separate
Postgres schema. This is already a wider feature set than most of the commercial apps reviewed
below — the audit below is about depth and polish opportunities, not catching up.

## 2. Already planned, not yet built (see `magic-improvements.md` for detail)

Time capsule seal/unseal, `lib/surprises/` (weighted "on this day" resurfacing — this independently
matches what Timehop's whole product is built around, see §3.2), "while you were away" partner
traces, letters/songs as physical album objects, season/dusk auto-reactivity, sound + haptics,
stats-as-sentences, vault entrance ceremony. Nothing below duplicates these; where an idea
overlaps, it says so instead of re-describing it.

## 3. Market scan

Researched: Between (35M+ couples, the closest direct competitor), Amora, OurCouple, Waffle, Day
One, StoryWorth, Timehop, 1 Second Everyday, Polarsteps, InnerBond, Lovewick, OurLoveVault, The
Couple (Days in Love).

### 3.1 Common patterns across couples apps (Between, Amora, OurCouple, The Couple, InnerBond)

- **Day counter / anniversary countdown**, often as a lock-screen or home-screen widget.
- **Shared calendar** for milestones and important dates.
- **Daily prompts / questions** to spark what gets written down (Amora's one daily question,
  Waffle's 10,000+ prompts, StoryWorth's weekly email prompt that becomes a printed book).
- **Chat/messaging** — universal in the couples-app category, but out of scope here; this repo is
  explicitly an archive, not a communication tool. Skip.
- **Virtual pet / streak gamification** (OurCouple) — a generic app pattern the experience-direction
  doc already warns against. Skip.
- **Mood check-ins** — thin fit; would read as a dashboard. Skip unless reframed as prose.

### 3.2 Timehop / 1 Second Everyday — resurfacing as the entire product

Timehop's whole value proposition is automated "on this day" surfacing with a hide/mute control
so unwanted memories don't resurface. **This is `lib/surprises/` from `magic-improvements.md` §2,
already scoped correctly** — the one addition worth folding in from Timehop specifically is a
lightweight per-memory "don't resurface this" flag, since Timehop users cite that control as
essential once the archive has enough history to contain a bad day. Cheap: one boolean column,
respected by the surprises weighting function.

### 3.3 StoryWorth — prompts as a content engine

StoryWorth's entire retention mechanic is a recurring prompt ("what's a memory from your first
year together?") that lowers the blank-page cost of adding content. This repo's composer is
currently blank-canvas only. A monthly prompt suggestion when opening the chapter composer — one
line, skippable, sourced from a small static bank plus a few that reference the couple's own data
(e.g. "it's been N months since [last kept promise] — anything come of it?") — would raise
memory-adding frequency without adding a form field. Frame as a whispered suggestion above the
composer, not a required field; resist turning it into a prompt-of-the-day feature/notification.

### 3.4 Polarsteps — trips as their own object, with a route

Polarsteps' core insight for travel content: a trip is not just photos tagged with a place, it's
a path over time, and the payoff is a printed Travel Book at the end. This repo's `lib/places/`
already does destination *discovery*; it doesn't yet let a couple record trips *taken*. Two
distinct ideas, don't conflate them:

- **A trip could be a lightweight grouping of memories + a places entry**, letting a chapter's
  album show "the Cebu trip" as its own unit rather than loose photos. Only worth building if
  actual trips exist in the couple's data — check before speccing further.
- Polarsteps explicitly calls out **single-owner recording as bad for couples** — whatever shape
  this takes here must stay dual-write from day one, not bolt on a second contributor later.

### 3.5 Physical export — the printed-book pattern

StoryWorth (printed book from prompts) and Polarsteps (printed Travel Book) both end their digital
product in a physical artifact — and this repo already has the instinct: `backups.md` is on the
map as "not yet built," and the existing `scripts/backup-export.ts` is the seed of it. Worth
scoping as: a yearly (or on-demand) export that lays out a chapter's memories into a print-ready
PDF — same visual language as the in-app album prints, not a generic template. This is a
meaningfully larger effort than anything else in this file (layout engine, pagination, print
bleed) — treat as a separate future plan, not a line item to pick up casually.

### 3.6 Widgets and ambient presence

Between and The Couple both lean on home-screen/lock-screen widgets (day counter, countdown to
next monthsary) as a way the archive stays present outside the app itself. This repo is a
PWA-shaped Next.js app; an installable-app home-screen widget is iOS/Android-native territory and
out of reach without a native wrapper. Not worth pursuing unless the project takes on a native
shell — flagging only so future sessions don't waste time on it. Not recommended.

## 4. Recommendations, ordered by magic-per-effort

1. **"Don't resurface this" flag** (§3.2) — trivially cheap, fold directly into the
   `lib/surprises/` build in `magic-improvements.md` #2 rather than treating as separate work.
2. **Composer prompt suggestions** (§3.3) — one whispered line above `MemoryComposer`, small
   static bank + a couple of data-derived ones. No new page, no new nav item.
3. **Trip grouping in Places/chapters** (§3.4) — only after checking whether the couple's actual
   data has enough trip-shaped content to justify it; otherwise defer indefinitely.
4. **Printed export** (§3.5) — real leverage (a tangible gift artifact) but real effort; scope as
   its own plan document when picked up, don't fold into this list's cadence.
5. **Widgets** (§3.6) — not recommended under the current stack.

## 5. Explicitly rejected (anti-patterns for this product)

Chat/messaging, virtual pet/streak gamification, mood-tracking dashboards, native home-screen
widgets, anything that turns a monthly prompt into a notification-driven daily habit loop. Each
of these is a load-bearing pattern in the commercial category researched above, and each conflicts
with the experience-direction invariants in `AGENTS.md` (guided progression over utility-app
patterns, stats as sentences not screens, no daily-engagement mechanics). Listed here so a future
session doesn't re-propose them from a fresh competitive scan without this context.
