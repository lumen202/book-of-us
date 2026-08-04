# Role-split letters/whispers (keeper ↔ partner), plus a keeper-only partner-ceremony preview

Follow-on to the same session's letter/whisper customization
([`2026-08-04-customizable-love-letter-in-settings.md`](2026-08-04-customizable-love-letter-in-settings.md),
[`2026-08-04-customizable-whisper-in-settings.md`](2026-08-04-customizable-whisper-in-settings.md)).
Those shipped a single shared letter and whisper set — which turned out wrong: **either** person
may want to write their own surprise for the other, and a shared value meant saving one
overwrote the other's, with no way to tell whose ceremony would show what.

## What shipped

- `lib/relationship/queries.ts` — `getLoveLetter`/`getWhisperLines` now take a second
  `viewerIsKeeper: boolean` argument and read a nested `{ keeper?, partner? }` object per field
  (`relationship.settings.loveLetter`/`.whisperLines`) instead of a flat value, returning what the
  *other* role saved (what was written *for* the viewer). Added `getMyLoveLetterDraft`/
  `getMyWhisperDraft`, same shape, returning the viewer's *own* saved side instead — used only to
  prefill the Settings forms. Shared shape-validation logic was factored into private
  `parseLoveLetter`/`parseWhisperLines` helpers, one call site per getter pair.
- `lib/relationship/mutations.ts` — `updateLoveLetter`/`updateWhisperLines` now resolve the
  caller's role via `isAdminEmail(user.email)` (imported from `lib/auth/admin.ts`, reusing the
  `user` already fetched for the signed-in check rather than calling `isCurrentUserAdmin()` a
  second time) and merge into the existing by-role object — `{ ...existingByRole, [role]: value }`
  — so saving your own letter never touches your partner's already-saved one.
- **Role = keeper (admin) vs. partner (non-admin)**, reusing the identity check that already
  distinguishes the app's only two accounts everywhere else (`/keeper/passwords`, the Keeper menu).
  No schema change — same `relationship.settings` jsonb column as before, just nested one level.
- `app/(app)/settings/page.tsx` — now also calls `isCurrentUserAdmin()` and passes each viewer's
  own draft (`getMyLoveLetterDraft`/`getMyWhisperDraft`) into the (unchanged) editor components.
  Editor copy (`LoveLetterEditor.tsx`, `WhisperEditor.tsx`) updated to state the one-way-surprise
  explicitly: "Only they'll see it, when it plays for them."
- `app/(app)/page.tsx` — added `isCurrentUserAdmin()` to the existing `Promise.all` fetch, and a
  new `previewAsPartner` search param. Normally renders the *incoming* letter/whisper
  (`getLoveLetter`/`getWhisperLines`); with `?previewAsPartner=1` renders the viewer's *own draft*
  instead — the only way to check your own outgoing letter, since it never appears on your own
  real ceremony by design.
- `components/dev/useCelebrationOverride.ts` — new `previewPartnerCeremony()`, identical to the
  existing `playCeremony()` but navigating to `/?celebrate=1&previewAsPartner=1`.
- `components/dev/CelebrationControls.tsx` (admin-only, Keeper menu) — new "Preview partner's
  ceremony" button next to "Play the ceremony", wired to `previewPartnerCeremony`.
  `CelebrationDevToggle.tsx` (the non-admin local-dev floating widget) was deliberately **not**
  given this button — it's for testing the incoming side, which already works normally.

## One-time side effect

The flat (unkeyed) `loveLetter`/`whisperLines` values saved during this session's *earlier*
testing (before the role split) are no longer read — the new `byRole()` helper in `queries.ts`
returns `{}` for anything that isn't a plain `{keeper, partner}` object, so those old saves are
silently ignored and the ceremony falls back to the hardcoded defaults again until each account
re-saves under its own role. Not migrated on purpose — pre-launch dev data, not worth the code.

## Verification

`tsc --noEmit`, `next build`, `eslint` — clean (only the same pre-existing, unrelated warnings
noted in the earlier two entries: `lib/ambient/useMeteors.ts`, `lib/navigation/useCloseOnBack.ts`).
Not yet exercised live with two real accounts in a browser this session — worth doing next: save a
letter as the keeper, confirm it's invisible on the keeper's own `?celebrate=1` but visible via
"Preview partner's ceremony", then repeat as the partner account and confirm the keeper's *real*
ceremony picks up the partner's letter instead.
