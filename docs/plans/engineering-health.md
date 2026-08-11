# Plan: Engineering Health

Compiled 2026-08-11 from a read-only audit of the repo (no changes made). This is the
**engineering-health** counterpart to [`magic-improvements.md`](magic-improvements.md), which
covers product/experience features — the two are meant to be worked independently and do not
overlap. Items are ordered by risk-reduction-per-effort and are independently shippable.

**Ground rules unchanged** (from `AGENTS.md`): logic in `lib/`, memory reads only via the RPCs in
`lib/memories/queries.ts`, no hard deletes, no duplicated business logic. Nothing in this plan
requires breaking an experience invariant; item 4 exists specifically to protect one.

## What is already healthy

Worth stating so effort does not get spent here: `npx tsc --noEmit` is clean; `npm test` is 20/20
green; RLS is enabled on **22 of 22** tables (verified by counting `create table` against
`enable row level security` across all 13 migrations); there are **zero** `TODO`/`FIXME`/`HACK`
markers in `app/`, `components/`, or `lib/`; and reduced-motion is handled globally for Framer
Motion via `MotionConfig reducedMotion="user"` in
[`components/motion/ReducedMotionConfig.tsx`](../../components/motion/ReducedMotionConfig.tsx),
so the per-component audit that looked necessary is not.

Scale for context: 209 TypeScript files, ~23.6k lines across `app/`, `components/`, `lib/`.

---

## 1. The verification gap — the highest-value item on this list

**Evidence.** `BUG-005` is recorded as *"fixed (2026-08-03), unverified"*. It is the **third**
consecutive performance fix carrying that caveat — `2026-07-27-emoji-reactions-and-mobile-perf`
and the two 2026-07-28 backdrop entries flagged the same thing. No browser trace has ever been
captured in this project; the bug file says so explicitly ("no Playwright/CDP tooling available in
this environment").

**Why it compounds.** Every one of those fixes was reasonable, and not one has been confirmed to
help. The backdrop has now had parallax removed *everywhere* — a real visual concession — on the
strength of unverified reasoning. If the actual cost is elsewhere (the bug file's own next
candidate: `motion.div` prints with large soft `box-shadow`, which repaints expensively and scales
with how many are on screen — naturally more on desktop), then the concession was paid for nothing
and the lag is still there.

**Proposal.** Add Playwright as a dev dependency with one narrow job — not an E2E suite:

- A single trace script that loads the shelf and a chapter page, scrolls a fixed distance, and
  reports long-task count and dropped frames.
- Run it once against `useParallax` restored and once with it disabled. That single comparison
  settles BUG-005 and retires three sessions of accumulated doubt.
- If it shows parallax was not the cost, restore the motion and move to the `box-shadow`
  hypothesis.

**Effort:** ~half a session. **Unblocks:** a real answer, plus the ability to verify any future
perf claim instead of reasoning about it.

## 2. Tests are on the code that never broke

**Evidence.** All 20 tests live in three files under `lib/places/` (`wheel`, `engine`,
`taxonomy`) — the newest and most self-contained subsystem. There are **zero** tests on the logic
that has actually produced bugs:

- `lib/memories/queries.ts` — chapter gating has been wrong twice
  (`2026-07-27-chapter-reveal-date-gating` → corrected to monthsary count, then
  `2026-07-29-preview-button-broke-under-current-month-exclusion`). This is a 303-line pure-ish
  module whose inputs are a date and a list; it is the single most testable, most
  historically-fragile thing in the repo.
- `getAppNow()` / `lib/relationship/devClock.ts` — every gating decision depends on it.
- `lib/bucket-list/mutations.ts` (350 lines).

**Also worth fixing here:** the `test` script is `tsx --test lib/**/*.test.ts`. Under a shell
without `globstar`, `**` behaves as a single `*`, so it matches `lib/places/*.test.ts` but would
**silently not run** a test at `lib/memories/queries/foo.test.ts`. Verified: `lib/*/*.test.ts`
currently matches exactly the 3 files that exist, so the bug is latent, not active — a test added
one level deeper would pass by never running. Switch to a runner-side recursive pattern.

**Proposal.** Table-driven tests for `findLookBackPrints` covering the two historical bugs by
name: (a) the automatic path excludes the current month, (b) `excludeCurrentMonth: false` includes
it. Those two assertions permanently pin the distinction that the 2026-07-29 entry warned must
"keep being solved independently".

## 3. No CI

**Evidence.** No `.github/` directory. `tsc`, `eslint`, and `npm test` are only ever run when
someone remembers.

**Proposal.** One workflow, three steps, on push and PR: `npx tsc --noEmit`, `npm run lint`,
`npm test`. ~20 lines. This is the cheapest item here and it is what keeps items 1 and 2 from
decaying.

## 4. No error boundaries — an experience-invariant risk, not just a technical one

**Evidence.** `app/` contains **10** `loading.tsx` files (waiting states were done properly in the
2026-08-08 session) and **zero** `error.tsx`, `not-found.tsx`, or `global-error.tsx`.

**Why it matters more here than in most apps.** A thrown error in any server component currently
drops the reader onto Next.js's stock error page — a stack trace in dev, a bare "Application
error" in production. For an app whose stated intent is *"opening memories, not using
software"*, that is the single most jarring thing the product can do, and it is reachable from a
Supabase hiccup or a bad signed URL. The `Waiting`/`WaitingScene` vocabulary already exists; the
error case should borrow it — a quiet in-world line ("this page is resting"), not a dialog.

**Proposal.** `app/(app)/error.tsx` and a `not-found.tsx` in the same voice, plus `global-error.tsx`
as a bare fallback. Route-group level is enough; per-route boundaries are not warranted yet.

## 5. Reduced-motion: verify the CSS half

**Evidence.** Framer Motion is globally covered (see "already healthy"). But `app/globals.css`
declares **25** `@keyframes` and **6** `animation:` properties against only **2**
`prefers-reduced-motion` blocks — CSS animations do not inherit `MotionConfig`. Separately,
`WhisperSequence.tsx` and `MonthInReview.tsx` sequence with `setTimeout`, which means a
reduced-motion reader waits the full duration for motion that has been suppressed.

**This is an audit, not a rewrite.** I did not trace which of the 25 keyframes are ambient
(garden life, safe to keep) versus transitional. The AGENTS.md invariant is specific and worth
re-reading before touching this: reduced-motion users should still get *semantic pacing without
abrupt jumps* — the goal is not zero motion, and it is not zero duration either.

## 6. Demo-schema parity has no guard

**Evidence.** 11 `demo.*` tables mirror 11 public tables (22 total, all with RLS). The demo
account's isolation depends entirely on that mirror staying complete — a future migration adding a
public table without its `demo.` twin degrades the demo silently, and the failure surfaces as
"the demo is missing a feature" long after the migration lands.

**Proposal.** A cheap parity assertion — a test or a `scripts/` check that reads the migrations and
fails when a public table has no `demo.` counterpart (or when one lacks RLS). This is the
mechanically-checkable kind of rule that is worth automating precisely because nobody will
remember it in six months.

## 7. Small cleanups

- **`useParallax` is now a no-op on every device** (BUG-005 fix) but still wired in. Decide
  deliberately after item 1: restore it or delete it. Leaving a disabled hook in place is how the
  next session inherits an unclear invariant.
- **`BUG-005` status** should move to `resolved` or back to `open` once item 1 produces an answer.
  "fixed, unverified" is accurate today and should not be permanent.
- **`docs/plans/`** is tracked and public (unlike `/docs/agent/`, which is gitignored). Nothing in
  this file or `magic-improvements.md` is sensitive, but that asymmetry is worth knowing before
  writing anything private into a plan.

---

## Suggested order

| # | Item | Effort | Why this position |
|---|---|---|---|
| 3 | CI workflow | ~20 min | Cheapest; protects everything after it |
| 4 | Error boundaries | ~1 hr | Highest user-visible risk, self-contained |
| 1 | Playwright perf trace | ~half session | Settles three sessions of open doubt |
| 2 | Gating tests + test glob | ~1 hr | Pins the logic that broke twice |
| 6 | Demo parity check | ~30 min | Prevents a silent future regression |
| 5 | CSS reduced-motion audit | ~1 hr | Needs care; do when unhurried |
| 7 | Cleanups | — | Falls out of items 1 and 5 |

## What I verified vs. assumed

**Verified by running or reading:** tsc clean; 20/20 tests pass; test file locations; the `**`
glob behaviour; RLS 22/22; table and `demo.` counts; absence of `.github/`; absence of
`error.tsx`/`not-found.tsx`; presence of 10 `loading.tsx`; the global `MotionConfig`; keyframe and
`prefers-reduced-motion` counts; zero TODO/FIXME markers; file and line counts.

**Assumed, not verified:** that the `box-shadow` hypothesis in BUG-005 is the next real cost (it is
the bug file's own untested guess, not mine); that all 25 keyframes need review (I did not classify
them); that the demo parity gap is currently clean (I counted tables, I did not diff column-level
schemas).
