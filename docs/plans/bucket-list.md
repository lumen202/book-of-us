# Implementation Plan — Interactive Bucket List → Memory Conversion

**Status:** proposed, not yet built
**Author:** agent session 2026-07-28
**Touches:** `supabase/`, `lib/bucket-list/` (new), `lib/media/`, `lib/memories/`, `components/bucket-list/` (new), `app/(app)/`
**Related:** [`audio-memories.md`](audio-memories.md) (free-tier budget, §0.3 there), [`time-capsule.md`](time-capsule.md)

---

## 0. Orientation

### 0.1 One product-design objection, raised once, then built anyway

`AGENTS.md` names the thing to avoid: *"Avoid generic app patterns (dashboard grids, admin-like
forms, utility-first empty states) unless functionally required."* A grid of checkboxes with filter
chips for Travel / Food / Date Night is, almost exactly, the pattern that sentence describes.

**The feature is right; the default rendering of it is what needs care.** So this plan builds every
requested capability — items, statuses, categories, the completion modal, the conversion — but
renders them as **a handwritten list of promises on a page of the book**, not as a task manager:

| Requested | Rendered as |
|---|---|
| Grid of items | A written list on album paper, one promise per line |
| Checkbox | A hand-drawn ink tick that *draws itself* when tapped |
| Status toggle | Two states: *someday* / *done*. Not a dropdown, not three columns |
| Category tags | A small ink glyph in the left margin (plane, fork, moon), not a coloured pill |
| Filter chips | **Omitted by default** — see §2.4. Ten promises don't need filtering |
| "Add item" form | One line that says *"and one day, we'll…"* and becomes an input on tap |

Everything asked for is present. None of it looks like Jira. If the owner wants literal chips and a
grid after seeing it, that is a one-component change — but shipping the storybook version first is
the cheaper direction to travel.

### 0.2 What this feature must reuse rather than reinvent

The `overview.md` invariant — *"if a page needs to reimplement… logic, something's wrong"* — bites
hard here, because the completion flow is a second photo composer:

| Needed | Already exists | Rule |
|---|---|---|
| Write a memory row | `createMemory()` in `lib/memories/mutations.ts` | **The only writer.** The conversion calls it; it does not insert. |
| Downscale before upload | `lib/media/downscaleImage.ts` | Call it; do not re-tune constants. |
| Browser→bucket upload | Inline in `MemoryComposer.tsx` (~lines 74–98) | **Extract to `lib/media/uploadMemoryMedia.ts` first** — see §3.2. |
| Read memories | `getChapterMemories` RPC only | The bucket list never reads `memories` directly. |
| Soft delete | `deleted_at` everywhere, no DELETE policy | Applies to the new table too. |
| Signed URLs | `getSignedUrl`, server-side | §2.5: the list itself shows **no photos at all**. |

### 0.3 Free-tier budget (Supabase Free, verified 2026-07-28)

1 GB storage · 5 GB egress/month · 500 MB database. Full table in
[`audio-memories.md` §0.3](audio-memories.md). What it means here:

- **The bucket list table is free.** A promise is ~200 bytes of text. A thousand of them is 200 KB
  against a 500 MB database. Store text generously; it is the abundant resource.
- **The only storage this feature spends is the completion photo** — and that is a photo that would
  have been added to the chapter anyway. **This feature adds no new storage class.** Its marginal
  cost over "add a photo to the album" is zero, and it should stay that way.
- **The list page must ship zero images.** This is the design constraint that matters (§2.5): no
  per-item cover photos, no thumbnail of the completed memory in the list. Category glyphs are
  inline SVG. A bucket list page that signed a URL per completed item would become the app's
  second-most-expensive page for decoration.
- Do **not** add a "gallery of everything we've done" view in v1. It is the obvious next screen and
  it is `N` signed URLs per visit for a set that only grows.

---

## Phase 1 — Database schema & the goal→memory conversion

### 1.1 Migration `0006_bucket_list.sql`

```sql
create table bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,                    -- "see snow together"
  note text,                              -- optional, written when added
  category text not null default 'other'
    check (category in ('travel','food','date','adventure','home','someday','other')),
  status text not null default 'open'
    check (status in ('open','done')),
  position integer not null default 0,    -- manual ordering; see 1.3
  completed_at date,                      -- date-only, matches memories.occurred_at
  memory_id uuid references memories (id),-- THE LINK. null until completed.
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index bucket_list_open_idx on bucket_list_items (position)
  where deleted_at is null and status = 'open';
```

Plus the standard three: `bucket_list_items_set_updated_at` trigger (reuse `set_updated_at()`),
`alter table … enable row level security`, and select/insert/update policies checking
`auth.uid() is not null`. **No delete policy** — same as every other table.

**Design notes, each one load-bearing:**

- **`category` is a check constraint, not a `categories` table.** A join table would be correct for
  an app with user-defined taxonomies. This is two people with a fixed handful of kinds of promise;
  a second table buys a JOIN on every read and an admin screen nobody wants. Adding a category later
  is a one-line `alter constraint`. This mirrors how `memories.type` is already modelled — follow
  the house pattern.
- **`memory_id` is the entire conversion.** See §1.2.
- **`completed_at` is `date`, not `timestamptz`,** to match `memories.occurred_at` exactly. The two
  are copied between each other; a type mismatch here becomes a timezone-drift bug where a memory
  lands a day off from its promise.
- **No `target_date` column.** A deadline on a shared dream turns it into an overdue task, and an
  overdue task is a small recurring reproach. If "before the wedding" matters, it goes in `note` as
  prose. This is a product decision worth defending in review.

### 1.2 The conversion: link, never copy

When an item is completed, **one memory row is created and its id is stored on the item.** The
item's text is *not* duplicated into the memory and then maintained in two places.

```
bucket_list_items.memory_id ──→ memories.id
```

- **Source of truth for the promise** = `bucket_list_items.title`.
- **Source of truth for the memory** = the `memories` row (its own title/caption, from the modal).
- They are allowed to say different things. *"see snow together"* becomes a print captioned
  *"Sagada, 4am, freezing"*. Forcing them to match would be wrong — the wish and the day it
  happened are different sentences.

**Why not the alternatives:**

| Alternative | Why not |
|---|---|
| `memories.bucket_item_id` (reverse FK) | Puts a column on the hot, huge table for a rare relationship, and every memory query pays for it. The sparse side should hold the pointer. |
| Both directions | Two truths to keep in sync, and a second place for them to disagree. |
| A `bucket_list_completions` join table | A 1:1 relationship modelled as many-to-many. Unjustified until an item can produce several memories — which it can't, and shouldn't. |
| Copy the text into the memory and delete the item | Destroys the record that it *was* a promise, which is the emotional content of the whole feature. |

**`memory_id` is nullable and that is a feature, not a gap.** Two legitimate states have no memory:
an open item, and — per §3.5 — an item completed **without a photo**. Marking "we finally saw snow"
as done at 2am with no picture must be allowed to succeed. The list shows it ticked; there is simply
no print to turn to.

### 1.3 `lib/bucket-list/` — the module

```
lib/bucket-list/
  types.ts        BucketListItem, BucketCategory, plus CATEGORIES with glyph + label
  queries.ts      listBucketItems() — direct table read, RLS-gated
  mutations.ts    addItem, renameItem, reorderItems, completeItem, reopenItem, removeItem
```

**Reads go directly to the table, not through an RPC** — and that is consistent, not a violation.
`data-model.md` scopes the "no raw reads" rule to `memories` specifically, because that table
carries time-capsule gating; it explicitly notes `memory_reactions` and `memory_comments` read the
table directly for the same reason. Bucket list items have no unlock semantics. Follow the
reactions precedent, and say so in a comment so the next session doesn't "fix" it.

**`completeItem` is the one function that matters**, and it is a server action orchestrating a
sequence, not a transaction — Supabase's JS client has no multi-statement transaction. Order is
chosen so that every failure point leaves recoverable state:

```
completeItem({ itemId, occurredAt, caption, storagePath, thumbnailPath, meta })
  1. resolve the target chapter          → §4.1 (may create one)
  2. createMemory(...)                   → the ONLY memory writer
  3. update bucket_list_items
       set status='done', completed_at, memory_id
  4. revalidatePath('/bucket-list') and the chapter path
```

**If step 3 fails after step 2 succeeded, an orphan memory exists** — a print in the album not
linked to its promise. That is the *correct* failure direction: the photo, which is the irreplaceable
thing and is already uploaded, is safe; the link is metadata that can be repaired. The inverse order
would risk an item marked done pointing at nothing. Log it loudly and let the user retry; a retry
that finds `memory_id` already set is a no-op (§4.4).

---

## Phase 2 — The list UI

### 2.1 Route and placement

`app/(app)/bucket-list/page.tsx` — its own page, reached from `AppHeader`, **not** a section on the
home page. Home is the cover and the shelf; `experience-direction.md` describes its arc as arrival →
invitation → exploration → reflection, and a to-do list bolted into that arc is a second competing
call to action in a page built around having one.

Server component: `listBucketItems()`, pass to a client shell. Ends with `ClosingReflection`, like
every other page.

### 2.2 The page, top to bottom

1. **A title page beat** — a line of framing copy (*"Things we still owe each other."*), the same
   register as the chapter title page.
2. **The open promises**, in `position` order, each one line: category glyph in the margin, the
   promise in the serif face, a tick target at the right. On album paper (`surface` panel with the
   faint warm bloom), reusing `MemoryGrid`'s sheet treatment so the two pages feel like the same book.
3. **The kept promises** below, under a quiet divider — ticked, slightly faded, in an ink that has
   settled. Each links to its print if it has one. **This section is the reward** and it grows over
   years; it is why the page is worth revisiting.
4. **The add line** — §2.6.

### 2.3 Components

```
components/bucket-list/
  BucketList.tsx        client shell; holds optimistic state, renders both sections
  BucketItemRow.tsx     one promise: glyph, text, tick target, long-press to edit
  CategoryGlyph.tsx     inline SVG per category — no image files, no icon library
  CompletionModal.tsx   Phase 3
  AddPromiseLine.tsx    §2.6
```

`CategoryGlyph` as hand-drawn inline SVG paths in `currentColor`: consistent with the painted world
(everything in `components/ambient/paint/` is drawn, not imported), theme-aware for Celebration Mode
for free, and **zero network requests** — which is the §0.3 rule about the list shipping no images.
An icon library would be a bundle dependency for eight glyphs.

### 2.4 Categories without filter chips

Categories are **shown**, not **operated**. The glyph in the margin is the whole feature at ten
items. A filter bar is a control surface for a scale this list won't reach for years.

**The trigger for adding filtering: more than ~25 open items.** Write that number down. When it
arrives, the right answer is probably *grouping* under quiet headers rather than filter chips — the
list re-sorts itself into Travel / Food / Date Night as it grows, and nobody has to click anything.

### 2.5 Zero images on this page — the free-tier line

No cover photo per item. No thumbnail of the completed memory beside a kept promise. A kept promise
links to its print with **text** (*"there's a photograph"*), and the photo lives where photos live.

This is a genuine restraint, because a strip of thumbnails down the kept-promises list is a
tempting design. It would also be `N` signed URLs per page load — the exact cost that
`reading-experience.md` calls *"the one thing on the chapter page that grows"* — on a page whose
list only ever grows. **If a visual reward is wanted later,** sign **one** URL for the most recently
kept promise and show that single print. One is affordable; `N` is not.

### 2.6 Adding a promise

One line at the end of the list reading *"and one day, we'll…"*. Tapping it turns that line into an
input in place; typing and pressing Enter adds the promise and re-renders the line beneath. The
category defaults to `other` and is set by tapping the margin glyph, which cycles through the set —
**not** a `<select>`. Optional note is revealed by a second tap, not shown by default.

No modal, no form, no Save button. Adding a promise should cost one tap and one sentence.

### 2.7 State: optimistic, with the tick as the exception

Ticking, reordering and renaming update optimistically (React 19 `useOptimistic`) — instant, revert
on failure.

**Completion is deliberately not optimistic.** It uploads a photo and writes two tables; showing it
as done before that lands means showing a promise kept that isn't recorded. The tick animation plays
*into* the modal (§3.1), so the interaction still feels immediate while the truth waits for the
server.

---

## Phase 3 — The completion flow

### 3.1 The beat structure

This is the emotional centre of the feature and gets the pacing treatment
`experience-direction.md` asks for — beginning, buildup, reveal, resolution:

1. **Tick** (~400ms) — the ink tick draws itself along its path (SVG `pathLength` + `stroke-dashoffset`).
   The promise line lifts very slightly off the page.
2. **Ask** — the modal rises from the ticked line, not from screen centre; it should read as the line
   *opening*. Three fields, in this order and no more: **photo, date, note.**
3. **Working** — on submit, the modal's content cross-fades to the photo alone while it uploads.
4. **Become** (~700ms) — the photo settles into a polaroid frame: white mat, four corner mounts, the
   deterministic tilt from `MemoryCard`'s `TILTS`. **The promise becomes the print.** This is the
   one animation in the feature worth spending real effort on, because it is the entire product
   metaphor made literal.
5. **Resolve** — the print shrinks back down into the list, the line moves into "kept promises", now
   reading *"there's a photograph"*. Offer one line: *"see it in the album"* → the chapter.

**Reduced motion:** all five beats survive as cross-fades with the same durations. The tick appears
rather than draws; the polaroid fades in already framed. Rhythm preserved, motion removed — the
`ReducedMotionConfig` rule.

### 3.2 Extract the upload pipeline first — do this before anything else

`MemoryComposer.handleSave()` currently inlines: `crypto.randomUUID()` → folder path → two
`downscaleImage` calls → two `supabase.storage.upload` calls → `addMemory`. The completion modal
needs the identical sequence.

**Copying it is the failure this plan is most likely to produce**, and it would violate the
`lib/`-not-pages invariant on day one. So:

```ts
// lib/media/uploadMemoryMedia.ts  — extracted verbatim, behaviour unchanged
export async function uploadMemoryMedia(
  file: File,
  { chapterId, memoryId }: { chapterId: string; memoryId: string },
): Promise<{ storagePath: string; thumbnailPath: string; meta: {...} }>
```

Ship this as its **own commit**, with `MemoryComposer` refactored to call it and verified working,
**before** the bucket list touches it. Then the modal is a caller, not a copy. This also means the
free-tier downscale settings (`ORIGINAL_MAX_EDGE = 2000`, `THUMB_MAX_EDGE = 720`) live in exactly
one place — so the §0.3 tuning lever stays a single edit, and a bucket-list photo can never
accidentally be stored at full camera resolution.

Add `meta.image_bytes` to the returned meta while in here (see [`audio-memories.md` §3.4](audio-memories.md))
— one line, and it makes bucket usage queryable in SQL for both features at once.

### 3.3 The three fields, and why not four

| Field | Default | Notes |
|---|---|---|
| Photo | none | **Optional** (§3.5). One file, not many — a promise kept is one moment. Camera capture on mobile via `capture="environment"`. |
| Date completed | **today** | Prefilled. Most completions are logged the same day. A small "not today?" reveals the picker; it is not shown by default. |
| Note | empty | Becomes the memory's caption. Placeholder is the promise text, so leaving it blank still produces something meaningful. |

**No chapter selector.** The chapter is derived (§4.1). Asking which month a memory belongs to is
exactly the metadata-entry feeling `MemoryComposer`'s doc comment refuses.

### 3.4 Upload order

**Photo to the bucket first, then the server action.** Same as `MemoryComposer`, and the same
reasoning as the audio plan: a row written before its file exists points at nothing. `memoryId` is
generated client-side because the storage path convention needs it before the row exists.

A failed upload leaves the item **open** — nothing partially completed. Re-ticking retries cleanly.

### 3.5 Completing without a photo

Fully supported, and the modal says so (*"no photo? that's alright"*). Result: `status='done'`,
`completed_at` set, **`memory_id` null**, no memory row, no storage write.

Then: **offer to attach a photo later.** A kept promise with no print shows a quiet *"add the
photograph when you find it"*, which runs the same flow and back-fills `memory_id`. This is the
realistic path for anything completed before the feature existed, and it means the conversion logic
must be callable independently of the tick — one more reason `completeItem` and `attachMemoryToItem`
are separate mutations.

---

## Phase 4 — Chapter syncing, and the trap in "the current month's chapter"

### 4.1 The hard part of this entire feature

The requirement says the memory lands in *"the current month's chapter."* Three facts from
`reading-experience.md` and `lib/chapters/queries.ts` collide here:

1. **Chapters are not auto-created.** *"Future chapters get added for real as they're written, not
   pre-seeded speculatively."* The current month may have **no chapter row at all**.
2. **`chapters.month` is `unique`.** Two completions in the same month racing to create it will
   collide.
3. **Chapters unlock one per monthsary.** `listRevealedChapters()` gates the shelf *and* 404s a
   direct slug. A freshly created current-month chapter **may not be revealed yet.**

Fact 3 is the trap, and it is severe: naïvely creating the current month's chapter and writing the
memory into it means **the user ticks a promise, watches the polaroid animation, and the photograph
is then invisible** — no shelf entry, and a 404 if they follow the link. It would look exactly like
data loss, for the most emotionally loaded action in the app.

**Resolution — `resolveTargetChapter()` in `lib/chapters/queries.ts`:**

```
1. Is there a chapter for the current month that is REVEALED?  → use it.
2. Else: the newest revealed chapter                            → use it.
3. Else (no revealed chapters at all — impossible in practice,
   chapter one is revealed from day one)                        → throw a clear error.
```

**Recommendation: option 2, do not auto-create chapters.** Reasons:

- It cannot produce an invisible memory. Ever.
- `occurred_at` still records the true date, so when that month's chapter *is* written the memory
  can be moved with a one-line update — and the timeline (which reads `getAllMemories()` and sorts
  by `occurred_at`) is already correct in the meantime.
- Auto-creating chapters means auto-generating titles, which produces `"August 2026"` placeholder
  chapters on a shelf whose whole pacing premise is that chapters arrive deliberately.

**If auto-creation is chosen instead** (the owner may prefer strict month-accuracy), then it *must*
also mark the new chapter revealed, which means changing the unlock rule in
`listRevealedChapters()` — a change to the shelf's core pacing, and a much bigger decision than this
feature should make on its own. Flag it, don't do it quietly.

Either way: **tell the user where it went.** The resolution line reads *"tucked into August 2026"* —
naming the chapter, so the destination is never a surprise.

### 4.2 Race safety

If auto-creation is ever added, it must be `insert … on conflict (month) do nothing` followed by a
select, not a check-then-insert. With two users on a shared book, check-then-insert is a real race,
not a theoretical one.

### 4.3 Un-ticking a kept promise

Reopening an item **never deletes the memory.**

- `status → 'open'`, `completed_at → null`, **`memory_id` retained** (a new `unlinked_at` timestamp,
  or simply leave the pointer — leaving it is simpler and truthful: that print still exists).
- The print stays in the album. It is a real photograph of a real day; an accidental tick must not
  be able to remove it.
- If the user genuinely wants the print gone, they remove it from the album, where the existing
  soft-delete + `ConfirmDialog` flow already lives. **Two separate actions, deliberately** — the
  "no hard deletes" invariant expressed as UX.

### 4.4 Integration & edge-case checklist

**Conversion correctness**

- [ ] Tick with photo → exactly **one** memory row, `memory_id` set, print visible in the resolved
      chapter with `occurred_at` = the chosen date.
- [ ] Tick without photo → done, `memory_id` null, **no** memory row, **no** storage object.
- [ ] Photo attached later back-fills `memory_id` and creates the memory then.
- [ ] Double-tap the tick / double-submit → one memory, not two. Guard on `memory_id is null` in the
      `update … where` clause so the second write is a no-op at the database, not in React state.
- [ ] Upload fails → item stays open, no orphaned row, retry works.
- [ ] Step-3 failure after step 2 → orphan memory exists (by design), retry links it rather than
      creating a second (§1.3).
- [ ] Reopen → memory survives, print still in the album.
- [ ] Soft-delete the linked memory from the album → the kept promise degrades to "no photograph",
      does not crash. **Test this**; it is the dangling-pointer case.
- [ ] Soft-delete the item → gone from the list, memory untouched.

**Chapter resolution (§4.1)**

- [ ] Current month has a revealed chapter → lands there.
- [ ] Current month has **no** chapter → lands in the newest revealed one, and the UI **names it**.
- [ ] Current month has an unrevealed chapter → does **not** land there. This is the invisible-memory
      trap; verify explicitly.
- [ ] `DEV_NOW` set to a future month (`lib/relationship/devClock.ts`) → resolution follows the dev
      clock, consistent with the rest of the app.

**Experience**

- [ ] Empty list → not a utility empty state. One line inviting the first promise, in the page's own
      voice.
- [ ] Reduced motion → all five completion beats present, nothing jumps.
- [ ] Celebration Mode → the page is a `.scene-card` sheet; ink stays dark on light paper against
      the indigo garden. Loose lines over the sky use `.ink-legible`.
- [ ] Mobile 360px → promise lines wrap without the tick target moving; modal fits with the keyboard
      open (the field-order choice in §3.3 matters here — photo first, so the keyboard opens last).
- [ ] Keyboard: tick is a real `<button>`, Enter/Space works, focus ring visible, focus is trapped in
      the modal and returns to the ticked line on close.
- [ ] Long-press to edit does not collide with scroll — reuse `MemoryCard`'s 450ms + 10px slop
      constants rather than picking new ones.

**Free tier (§0.3)**

- [ ] The bucket list page signs **zero** signed URLs. Check the network panel — this is the
      §2.5 line, and it is easy to lose to a "small preview thumbnail" later.
- [ ] A completion photo is stored at the same size as a composer photo. Both go through
      `uploadMemoryMedia`; confirm the object sizes match (~350 KB + ~70 KB).
- [ ] `meta.image_bytes` populated, so bucket usage stays queryable in SQL.
- [ ] No third storage object per completion. One original, one thumb, nothing else.

### 4.5 Step-by-step execution guide

| # | Commit | Why this order |
|---|---|---|
| 0 | **Extract `lib/media/uploadMemoryMedia.ts`**, refactor `MemoryComposer` to use it, verify photo upload still works | Prevents the duplicated-pipeline failure. Standalone value even if the rest slips. |
| 1 | `0006_bucket_list.sql` + `lib/bucket-list/types.ts` + `queries.ts` | Schema and reads, verifiable in the SQL editor before any UI. |
| 2 | `resolveTargetChapter()` in `lib/chapters/queries.ts` + unit-verify against the three §4.1 cases using `DEV_NOW` | **The riskiest logic, isolated and proven before anything depends on it.** |
| 3 | `mutations.ts`: add / rename / reorder / remove. Wire `BucketList` + `BucketItemRow` + `CategoryGlyph`, no completion yet | A working, useful list ships here. Everything after is the payoff. |
| 4 | `completeItem` + `CompletionModal`, functional and unstyled. Run the whole §4.4 conversion checklist | Correctness before choreography. |
| 5 | Phase 3 choreography: tick draw, promise→polaroid transform, reduced-motion pass | The metaphor, once the mechanism is trustworthy. |
| 6 | `attachMemoryToItem` (photo-later path, §3.5) | Genuinely useful, but not on the critical path. |
| 7 | Docs (§4.6) | |

Steps 0 and 2 are where this feature is won or lost. Step 0 stops the codebase growing a second
upload path; step 2 stops the app eating a photograph. Both are small, both are boring, both should
be done while the diff is short enough to read carefully.

### 4.6 Docs to update when this ships

- [ ] `docs/agent/codebase-map/bucket-list.md` — new file; add a row to `codebase-map/INDEX.md`.
      Lead with the §4.1 chapter-resolution rule; it is the thing a future session will get wrong.
- [ ] `data-model.md` — the new table, and **why `memory_id` points that direction** (§1.2), plus a
      note that direct reads here are consistent with the reactions/comments precedent.
- [ ] `reading-experience.md` — `uploadMemoryMedia` is now the shared upload path, and the composer
      is one of two callers.
- [ ] `experience-direction.md` — add the bucket list surface, and record the §0.1 decision
      (checkbox list rendered as a written page) so it isn't "simplified" back into a grid.
- [ ] `docs/agent/log/2026-XX-XX-bucket-list.md` + a row in `log/INDEX.md`.
