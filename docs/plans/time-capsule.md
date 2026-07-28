# Implementation Plan — Locked Time Capsules

**Status:** proposed, not yet built
**Author:** agent session 2026-07-28
**Touches:** `supabase/`, `lib/memories/`, `lib/capsules/` (new), `components/capsule/` (new), `app/(app)/page.tsx`

---

## 0. Orientation — read this before writing any code

Two things about this repo change the shape of the obvious solution. Both are load-bearing.

### 0.1 The time capsule already half-exists

`memories.unlock_at timestamptz` is already in `supabase/migrations/0001_init.sql`, already
indexed (`memories_unlock_at_idx`), and already enforced inside
`supabase/functions/get_chapter_memories.sql`:

```sql
where deleted_at is null and (unlock_at is null or unlock_at <= now())
```

`docs/agent/codebase-map/data-model.md` states the intent explicitly: *"`unlock_at` on `memories`
makes **any** memory a potential time capsule, not just letters."*

**Therefore: do not create a standalone `time_capsules` table.** A parallel table would fork the
soft-delete plumbing, the RLS policies, the reactions/comments foreign keys, the admin archive, the
backup script, and the "no raw memory reads" invariant — five subsystems duplicated to gain one
column. The requested `TimeCapsule` entity maps onto the existing schema as:

| Requested field | Where it lives |
|---|---|
| `title` | `memories.title` |
| `message` / letter body | `memories.body` |
| optional media URL | `memories.storage_path` (+ `thumbnail_path`), signed on demand |
| creation date | `memories.created_at` |
| `unlockAt` | `memories.unlock_at` |
| `isOpened` | **new `capsule_openings` table** — see §1.2 |

A capsule is `type = 'letter'` (or any type) **with `unlock_at` set**. That is the whole entity.

### 0.2 The current RPCs hide locked rows *completely*

`get_chapter_memories` and `get_all_memories` filter locked rows out of existence. That is correct
for the album page — but it means the dashboard cannot currently know a sealed envelope exists at
all, and a locked capsule you can't see isn't a feature, it's an absence. Phase 1 adds **one new
RPC that returns a deliberately redacted projection** of locked capsules. It does not loosen either
existing RPC.

### 0.3 Invariants this plan must not break

From `docs/agent/codebase-map/overview.md`:

- **No raw memory reads.** Everything goes through an RPC, and every read lives in `lib/memories/`
  (or a new `lib/capsules/queries.ts` that calls RPCs only). No `.from("memories").select()`.
- **No hard deletes.** `capsule_openings` gets a `deleted_at` like every other mutable table, and
  no DELETE policy.
- **Cross-cutting logic lives in `lib/`,** never in a page or a component.
- **Signed URLs only, minted server-side,** via `lib/storage/getSignedUrl.ts`.

And from `AGENTS.md`: this is Next.js 16.2 with breaking changes vs. older training data. Before
writing the page/caching layer, read `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
and `.../02-guides/caching-without-cache-components.md`. **Do not assume `export const dynamic`,
`unstable_cache`, or `use cache` semantics from memory** — a countdown page that gets statically
cached is the single most likely way this feature ships broken.

---

## Phase 1 — Database schema & API routes (backend unlock checks)

### 1.1 Migration `0005_capsules.sql` — constraints, not new tables

Add to `memories`, guarding the invariants the UI will rely on:

1. **A partial index for the capsule query:** capsules are a tiny minority of rows, and the
   dashboard query is `unlock_at is not null and deleted_at is null` ordered by `unlock_at`. The
   existing `memories_unlock_at_idx` doesn't carry the soft-delete predicate; add
   `memories_capsule_idx on memories (unlock_at) where unlock_at is not null and deleted_at is null`.
2. **A check constraint on sealing:** nothing enforces that a capsule's `unlock_at` is in the
   future *at insert time*. Deliberately **do not** add a `check (unlock_at > now())` — check
   constraints must be immutable, and `now()` is not; Postgres will reject it. Enforce "future
   date" in the mutation layer (§1.4) and let the DB stay honest about historical backfills.

### 1.2 New table `capsule_openings`

`isOpened` is not a boolean on the capsule. This is a two-person book, and the seal-breaking
moment is the emotional payload — if one partner opens it on their phone at 7am, the boolean flips
and the other person's first sight of it is an already-open letter. Model it the way
`memory_reactions` is modelled (see `0003_reactions.sql`): one row per `(memory_id, user_id)`
composite primary key.

```sql
create table capsule_openings (
  memory_id uuid not null references memories (id),
  user_id uuid not null references auth.users (id),
  opened_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (memory_id, user_id)
);
```

- RLS enabled; `select` / `insert` / `update` policies all `auth.uid() is not null`, matching every
  other table. **No delete policy.**
- `isOpened` for the current reader = a live row exists for `(capsule, auth.uid())`.
- Bonus this buys for free: "Liezel opened this on the 12th" as a later UI beat, with no schema
  change.

### 1.3 New RPC `supabase/functions/list_capsules.sql`

This is the security boundary of the entire feature. Two functions, one file:

**`list_capsules()`** — returns a redacted projection, never `setof memories`:

```sql
returns table (
  id uuid,
  chapter_id uuid,
  is_unlocked boolean,   -- unlock_at <= now(), computed in Postgres
  unlock_at timestamptz,
  created_at timestamptz,
  title text,            -- NULL when locked
  body text,             -- NULL when locked
  has_media boolean,     -- true/false, never the path
  opened boolean         -- exists(capsule_openings for auth.uid())
)
```

The redaction is a `case when unlock_at <= now() then title else null end` **inside the SQL**, not
in TypeScript. Reasons, in order of importance:

1. The secret bytes never leave Postgres, so they cannot leak through a server component's
   serialized RSC payload, a `console.log`, an error boundary, or a future careless `select *`.
2. `now()` is the database's clock — one authority, immune to a client changing its system time
   and immune to server/client skew.
3. `storage_path` is never returned for a locked row, so no signed URL can be minted for it even
   by mistake.

**What a locked row *is* allowed to expose:** `unlock_at` (the countdown needs it), `created_at`
("sealed 4 months ago"), and `has_media` (lets the envelope hint at a photograph inside). Nothing
else. Note that `title` is withheld — a title like "For when you get the job" is itself the
message. If the author wants a visible label on the sealed envelope, add a separate
`meta.sealed_label` field in a later pass; do not repurpose `title`.

**`open_capsule(p_memory_id uuid)`** — the unlock write path:

```sql
-- re-checks unlock_at <= now() itself, and returns the full row ONLY if so.
-- Inserts into capsule_openings on conflict do nothing (idempotent).
-- Raises an exception if the capsule is still sealed.
```

Like `get_chapter_memories`, both are **`stable`/`volatile` as appropriate and deliberately NOT
`security definer`** — they run as the calling user so `memories_select` RLS still applies as a
second, independent layer. Copy that comment block from the existing function file; it explains why.

### 1.4 `lib/capsules/` — the TypeScript layer

New module, mirroring the shape of `lib/reactions/`:

- **`types.ts`** — `type Capsule = { id, isUnlocked, unlockAt, createdAt, hasMedia, opened }` and
  `type UnlockedCapsule = Capsule & { title, body, mediaUrl }`. **Two distinct types, not one type
  with optional fields.** This makes "read `.body` off a locked capsule" a compile error rather
  than a runtime `undefined`, and it is the cheapest guardrail in the whole plan.
- **`queries.ts`** — `listCapsules()` (calls the RPC), `getServerNow()` (returns `Date.now()` at
  render for the skew correction in §2.2). No direct table reads.
- **`mutations.ts`** — `sealCapsule(input)` validating `unlockAt > now()` and rejecting otherwise;
  `openCapsule(id)` calling the `open_capsule` RPC, then minting the signed media URL via
  `getSignedUrl` **only after** the RPC returned successfully.

### 1.5 Route surface — server actions, not route handlers

The app has no `/api` routes today; it uses server actions (`app/(app)/actions.ts`,
`app/(app)/chapters/[slug]/actions.ts`). Stay consistent:

- `app/(app)/actions.ts` (or a new `app/(app)/capsule-actions.ts`) gains
  `revealCapsuleAction(id)` — `"use server"`, calls `openCapsule`, returns the unlocked payload,
  then `revalidatePath("/")` so the dashboard re-renders with the capsule in its opened state.
- Read `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` first; also confirm
  `revalidatePath` semantics against `.../03-api-reference/04-functions/revalidatePath.md`.

**Caching:** the dashboard's capsule data is `now()`-dependent and must not be cached across the
unlock boundary. Determine the correct opt-out for this Next version from the caching docs above
rather than reaching for a remembered API. Whatever is chosen, the acceptance test is §4: load the
page one second before unlock, wait, and confirm a refresh yields the unlocked state without a
rebuild.

---

## Phase 2 — Frontend components & the countdown hook

### 2.1 Component tree

```
components/capsule/
  CapsuleShelf.tsx      Server component. Calls listCapsules(); renders nothing at all
                        when there are no capsules (no empty state — an empty-state card
                        is exactly the "generic app pattern" AGENTS.md forbids).
  SealedCapsule.tsx     Client. The locked envelope: wax seal, countdown, no content.
  OpenedCapsule.tsx     Client. Post-reveal letter on paper, media if present.
  CapsuleReveal.tsx     Client. Orchestrates the seal-break → unfold beat (Phase 3).
lib/capsules/
  useCountdown.ts       The hook.
```

`CapsuleShelf` mounts in `app/(app)/page.tsx` **between the intro copy and the Chapters shelf** —
before the chapter list, because a sealed letter addressed to you outranks a shelf of months you
have already read, and after the intro copy so the page still opens on ambience rather than on an
object demanding a click. It must sit *above* `ClosingReflection`, which per
`experience-direction.md` ends every page and must stay free of calls to action.

### 2.2 `useCountdown` — the hook, and the three things that make it non-trivial

```ts
useCountdown(unlockAt: string, serverNow: number): {
  days; hours; minutes; seconds; totalMs; isExpired;
}
```

1. **Clock skew.** The server passes `serverNow` (its `Date.now()` at render). The hook computes
   `offset = serverNow - clientNowAtMount` once and applies it to every subsequent tick. Without
   this, a user whose laptop clock is a day fast sees a capsule "unlock" that the server will
   refuse to open — a countdown that hits zero and then does nothing is worse than no countdown.
2. **Hydration.** The server and the client will not agree on the second. Render a stable
   placeholder (the static `unlock_at` date, or dashes) on the first paint and start ticking in an
   effect after mount, so SSR output and first client render match. This is the same class of bug
   `celebration-mode.md` documents for `data-celebration` — that doc's rule is "render always,
   reveal by CSS"; here the equivalent is "render static, animate after mount."
3. **Tick granularity and backgrounded tabs.** `setInterval(1000)` drifts and is throttled to
   ~1/min in background tabs. Recompute from `Date.now() + offset` on every tick (never decrement a
   counter), and re-sync on `visibilitychange`. Below one hour remaining, tick seconds; above one
   day, tick once a minute — a capsule 8 months out re-rendering 60×/minute on the home page, over
   the painted-world backdrop that `docs/agent/log/2026-07-28-backdrop-compositing-and-parallax-cost.md`
   already fought for frame budget, is a real cost for a number that changes once a day.

The hook returns `isExpired`. **`isExpired` does not reveal anything.** It swaps the sealed card's
copy from a countdown to "It's time" and enables the reveal affordance. The content still arrives
only from the server action in §1.5. This separation is the whole point: the client is allowed to
know *when*, never *what*.

### 2.3 The reveal data flow

```
SealedCapsule (countdown hits zero)
  → user taps the seal            [ deliberate, not automatic — see §3.2 ]
  → revealCapsuleAction(id)       [ server: re-checks now() in Postgres ]
  → returns { title, body, mediaUrl } or throws "still sealed"
  → CapsuleReveal plays the break-and-unfold
  → OpenedCapsule renders the letter
```

Pending state during the action is part of the choreography, not a spinner: the seal should
already be cracking while the request is in flight (see §3.1).

---

## Phase 3 — UI/UX animations & micro-interactions

Art direction constraints, from `theming.md` and `celebration-mode.md`:

- Cream paper, ink, accent. **No true grey, no black — every neutral carries a hue.**
- Type over the painted sky needs `.ink-legible`; type on a translucent card needs `.scene-card`.
  The capsule sits on the home page, over the garden, so **the envelope is a `.scene-card` and any
  loose line above it is `.ink-legible`.** Getting this wrong is what makes the night build look
  broken — that mistake is documented, don't repeat it.
- Framer Motion 12 is already a dependency; `components/motion/ReducedMotionConfig.tsx` is already
  wired globally. Use it rather than hand-rolled CSS keyframes for the reveal.

### 3.1 The sealed state — an object, not a card

- Paper envelope on the album-paper texture, with a **wax seal** drawn as inline SVG (matching the
  wax-sealed letter that already exists in `lib/opening-sequence/` — reuse or extract that art
  rather than drawing a second, differently-shaped seal).
- Idle: the seal breathes almost imperceptibly (scale 1 → 1.015, ~6s, ease-in-out). Same ambient
  register as `lantern-flame`.
- Hover/press while locked: the envelope lifts and tilts a degree, then settles back — a "not yet"
  gesture. It must feel *answered*, not inert, but must never suggest it will open.
- The countdown is set in the small letter-spaced uppercase style already used for
  `Open gently` / `Chapters` eyebrow text, sitting under the envelope like a postmark. Format it in
  story language: *"opens in 4 months, 12 days"* far out; *"opens in 03:14:07"* on the last day;
  *"It's time."* at zero. Never a bare `00d 00h 00m`.

### 3.2 The unlock — three beats

The reveal is **user-initiated**. A capsule that pops open by itself while the user is scrolling
past spends the whole emotional payload on an empty room. When the countdown expires, the envelope
changes state — the seal glows warm, the copy becomes an invitation — and waits.

1. **Break** (~500ms): wax splits along a jagged path, the two halves rotate apart and fall out of
   frame with gravity easing. The envelope flap rotates open on an X-axis 3D transform
   (`transform-origin: top`, `perspective` on the parent).
2. **Unfold** (~700ms, overlapping the tail of beat 1): the letter rises out of the envelope and
   unfolds — `scaleY` from a creased state, with two intermediate fold lines as `box-shadow` seams
   that fade out. This is the "unfold, lift, turn, reveal" tactility AGENTS.md asks for.
3. **Settle** (~400ms): the letter reaches reading position, the body text fades in **line by line
   with a small stagger**, echoing `WhisperSequence`'s one-line-at-a-time pacing. Media, if any,
   appears last, mounted as an album print with corner mounts, consistent with `MemoryCard`.

### 3.3 Celebration

Confetti is the generic answer and it is wrong here. `lib/opening-sequence/art/HeartFirework.tsx`
already exists, and its file comment explains why the ceremony fires **one** firework rather than a
volley. Reuse it: one heart firework on the settle beat.

If the capsule unlocks *on the 5th*, let `data-celebration` do more — the seal wax picks up the
lantern warmth against the indigo garden. That is the "distinct atmosphere shift" requirement, and
it costs nothing because the attribute is already on `<html>`.

### 3.4 Reduced motion

Per AGENTS.md, reduced-motion users must still get **semantic pacing, not an abrupt jump**. The
break/unfold becomes a cross-fade sequence with the same three beats and the same total duration:
sealed → (fade) → letter → (fade) → body lines. Nothing translates, rotates, or scales; the
*rhythm* survives. Verify with the `@media (prefers-reduced-motion: reduce)` block at
`app/globals.css:646` and with `ReducedMotionConfig` in place — do not add a fourth motion opt-out
mechanism.

### 3.5 Authoring a capsule

Extend `MemoryComposer` rather than building a second composer — `experience-direction.md` warns
that metadata fields are the thing to resist. One addition: a "seal this until…" affordance that is
*off* by default and, when on, offers relative choices (*next monthsary*, *a year from now*, *pick a
date*) rather than a bare datetime input. Relative options are both kinder and less likely to
produce an accidental 1970 timestamp.

---

## Phase 4 — Integration & edge-case testing checklist

There is no test runner in `package.json` today (`lint` only). Do not stand up a test framework as
part of this feature — that is a separate decision. This is a **manual verification checklist**;
run every row before considering the feature done.

### Security — the ones that matter most

- [ ] **View source / RSC payload on a page with a locked capsule contains none of: the body text,
      the title, the storage path.** Check the raw streamed HTML and the flight payload, not just
      the DOM. This is the requirement the whole design exists to satisfy — if it fails, nothing
      else in this list matters.
- [ ] Calling `revealCapsuleAction(id)` directly for a still-sealed capsule (from the browser
      console, with a valid session) **throws** and writes no `capsule_openings` row.
- [ ] Setting the OS clock a year forward does not unlock anything: countdown reads zero locally
      (skew correction should mostly prevent even this), reveal still refuses.
- [ ] No signed URL is ever minted for a locked capsule's media. Confirm no Storage request fires
      on a page with only locked capsules.
- [ ] Signing out and hitting the reveal action returns an auth error, not content.
- [ ] `grep -rn "from(\"memories\")" lib/ app/ components/` still returns only the two sanctioned
      call sites in `lib/memories/`. **The invariant survived.**

### Time and clock

- [ ] `unlock_at` exactly `now()` — boundary is `<=`, so it unlocks. No off-by-one.
- [ ] Capsule created with `unlock_at` in the past → rejected by `sealCapsule` with a human message.
- [ ] Countdown crossing a DST boundary shows the right number of days (store and compare in UTC;
      display in local).
- [ ] Tab backgrounded for an hour across the unlock moment → on return, the card is in the correct
      expired state within one tick (`visibilitychange` re-sync).
- [ ] Page left open across the unlock moment, never touched → countdown reaches zero and the card
      becomes openable **without a manual refresh**.
- [ ] Unlock far in the future (10 years) formats sensibly and doesn't tick every second.

### Data and lifecycle

- [ ] Soft-deleting a capsule removes it from the dashboard (`deleted_at` filter present in the new
      RPC, not just the old ones).
- [ ] A soft-deleted capsule still appears in the admin archive and restores correctly.
- [ ] A locked capsule does **not** appear in its chapter's album page (existing RPCs unchanged) —
      confirm this is still true after the migration.
- [ ] After unlocking, the capsule *does* appear in the album page and in `getAllMemories()`, so
      timeline stats count it.
- [ ] Reactions and comments work on an unlocked capsule (foreign keys are to `memories`, so they
      should — verify).
- [ ] Opening as partner A leaves partner B's `opened` state false; B still gets the full
      seal-breaking reveal.
- [ ] `open_capsule` called twice is idempotent — no duplicate-key error surfaced to the user.

### Experience

- [ ] Zero capsules → the section renders nothing at all. No empty-state card.
- [ ] Reduced motion → all three beats still occur, nothing jumps, total duration comparable.
- [ ] Mobile (360px): envelope, countdown, and unfolded letter all legible; the letter does not
      overflow; the reveal animation holds frame rate over the painted backdrop. Check on a real
      Android device — `BUG-003` and the parallax work are both mobile-rendering history.
- [ ] Celebration Mode (`?celebrate=1`) → capsule card is `.scene-card`, ink stays dark on light
      paper against the indigo garden. No muddy `bg-surface/55` midtone.
- [ ] Keyboard: the seal is reachable by tab, has a visible focus ring, and opens on Enter/Space.
      Countdown is inside an `aria-live="off"` region (a live region announcing every second is
      hostile); the expired state announces once.
- [ ] `npm run lint` clean; `npm run build` clean.

### Docs to update when this ships (required by AGENTS.md)

- [ ] `docs/agent/codebase-map/time-capsules.md` — write it; flip its row in
      `codebase-map/INDEX.md` from *not yet built* to *current*.
- [ ] `docs/agent/codebase-map/data-model.md` — document `capsule_openings` and the
      `list_capsules` projection, and update the "Time-capsule enforcement is NOT an RLS concern"
      section to mention the new RPC alongside `get_chapter_memories`.
- [ ] `docs/agent/log/2026-XX-XX-time-capsules.md` — new immutable entry; add its row to
      `log/INDEX.md`.
- [ ] Any bug found along the way gets a `bugs/BUG-NNN-*.md`, even if fixed in the same session.

---

## Build order (suggested commits)

1. `0005_capsules.sql` + `list_capsules.sql` — verify the redaction in the SQL editor **before any
   UI exists**. Query it as an authenticated user with a locked capsule and confirm `body is null`.
2. `lib/capsules/` types, queries, mutations + the reveal server action. Verify from a server
   component that prints JSON.
3. `useCountdown` + `SealedCapsule`, unstyled. Verify skew, hydration, and background-tab behaviour.
4. Wire `CapsuleShelf` into the home page. Run the full security checklist above — **before**
   spending any time on the animation.
5. Phase 3 art direction, the reveal choreography, reduced-motion path.
6. `MemoryComposer` sealing affordance.
7. Docs.

Steps 1–4 are the feature; steps 5–6 are what makes it worth having. Doing them in this order means
a security failure is found while it costs one commit to fix.
