# Customizable love letter, editable from Settings

The monthsary ceremony's letter (`lib/opening-sequence/sequences/MonthsaryOpening.tsx`) used to be
two hardcoded string variants (first month vs. recurring), picked by `monthsaryNumber === 1`. Added
a way to write a custom letter from Settings that overrides both, while keeping the hand-tuned
defaults as the fallback when nothing's been saved.

## What shipped

- `lib/relationship/types.ts` — new `LoveLetter` type (`salutation`/`body`/`signoff`).
- `lib/relationship/queries.ts` — `getLoveLetter(relationship)`, reading and shape-validating
  `relationship.settings.loveLetter` (jsonb, previously unused — see `data-model.md`). Returns
  `null` on anything absent or malformed, never a partially-filled letter.
- `lib/relationship/mutations.ts` (new file) — `updateLoveLetter()`. Any signed-in user can call it
  (plain `auth.getUser()` check, same as `lib/memories/mutations.ts`'s `createMemory` — **not**
  `requireAdmin()`), matching this app's "two-person archive, either account edits everything"
  model. No RLS change needed — `relationship_update` already allows any authenticated user
  (`0001_init.sql:113`).
- `app/(app)/settings/actions.ts` — `saveLoveLetter` server action wrapping the mutation in the
  same `{status, message} | null` shape the password actions already use.
- `components/settings/LoveLetterEditor.tsx` (new) — client form, `useActionState`, styled to match
  `ChangePasswordForm.tsx`. Rendered in `app/(app)/settings/page.tsx`, which is now an async server
  component (fetches `getRelationship()`/`getLoveLetter()` to prefill the form).
- `letter?: LoveLetter` threaded through `OpeningSceneProps` → `HomeCover` → `OpeningSequence` →
  `MonthsaryOpening`, same prop-drilling pattern as `celebrationLabel`/`monthPrints`. Assembled in
  `app/(app)/page.tsx` alongside the relationship data already fetched there.
- `MonthsaryOpening.tsx`: `const letter = customLetter ?? (firstMonth ? {...} : {...})` — the saved
  letter wins when present; the two hand-written defaults (and the doc-comment explaining their
  tone) are untouched.

## Watch out for next session

- One letter only — no per-month letters. If that's wanted later, the storage shape
  (`settings.loveLetter`) would need to become a keyed structure, and the Settings UI would need a
  list editor instead of one form.
- `updateLoveLetter` throws if `relationship` hasn't been seeded yet (`getRelationship()` returns
  `null`) — there's no relationship-creation flow in this app yet, so that's a real (if rare) edge
  case, not defensive-programming noise.
- No storybook/test coverage added — verified via `tsc --noEmit`, `next build`, and `eslint` (both
  clean; the lint run's pre-existing errors are unrelated files: `lib/ambient/useMeteors.ts`,
  `lib/navigation/useCloseOnBack.ts`). Did not exercise the ceremony's `?celebrate=1` preview path
  in a running browser this session — worth doing before considering this fully verified end to end.
