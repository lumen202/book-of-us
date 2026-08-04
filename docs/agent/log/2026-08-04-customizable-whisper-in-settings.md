# Customizable whisper lines, editable from Settings

Follow-on to the same session's [`2026-08-04-customizable-love-letter-in-settings.md`](2026-08-04-customizable-love-letter-in-settings.md):
the `whisper` beat (the spoken lines between the look-back photos and the "Happy Nth Monthsary"
reveal — `monthsaryWhispers()` in `lib/opening-sequence/whispers.ts`) was still two hardcoded
string arrays (`FIRST_MONTH`/`LATER_MONTHS`). Extended the same customization pattern to it.

## What shipped

- `lib/relationship/queries.ts` — `getWhisperLines(relationship)`, reading and validating
  `relationship.settings.whisperLines` (a flat array of non-empty strings). Same defensive-shape
  reasoning as `getLoveLetter` — malformed/absent returns `null`, never a partial list.
- `lib/relationship/mutations.ts` — `updateWhisperLines(lines)`, same auth model as
  `updateLoveLetter` (any signed-in account, plain `auth.getUser()` check, no `requireAdmin()`).
  Trims and drops blank lines; throws if nothing's left.
- `app/(app)/settings/actions.ts` — `saveWhisper` server action; splits the textarea's value on
  `\n` before handing lines to the mutation.
- `components/settings/WhisperEditor.tsx` (new) — one textarea, one line per line, placeholder
  showing the `FIRST_MONTH` set. Rendered in `app/(app)/settings/page.tsx` below the letter editor.
- `letter`'s prop-drilling companion `whisperLines?: string[]` threaded through the same chain:
  `OpeningSceneProps` → `HomeCover` → `OpeningSequence` → `MonthsaryOpening`, assembled in
  `app/(app)/page.tsx` alongside `loveLetter`.
- `MonthsaryOpening.tsx`: `lines={customWhisperLines ?? monthsaryWhispers(monthsaryNumber)}` —
  saved lines win when present, the two hardcoded sets in `whispers.ts` are untouched otherwise.

## Decisions carried over from the letter feature (confirmed with the owner again for this one)

- One whisper set reused every celebration, not separate first-month/later-months sets — same
  scope call as the letter, for the same reason (simplicity, and the app not needing to reason
  about which "first month" wording is still true once it's user-authored).
- Free-form line list rather than a fixed 4-field form, matching `whispers.ts`'s own shape (plain
  string arrays, not a fixed tease/tease/sincere/"I love you" structure) — more flexible, less
  opinionated about pacing.

## Verification

`tsc --noEmit` and `next build` both clean (see the letter entry for the one pre-existing,
unrelated lint state — `lib/ambient/useMeteors.ts`, `lib/navigation/useCloseOnBack.ts`). As with
the letter feature, not yet exercised live in a browser via the `?celebrate=1` preview path this
session.
