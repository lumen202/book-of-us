# Waiting States

Every "something is happening" moment in the book, and the one rule that governs all of them.

## There are no spinners, and there must not be one

A rotating ring is the most recognisable piece of stock software there is, and it says *an
application is busy* — the exact register `experience-direction.md` exists to keep out of this
project. The replacement idiom is **ink soaking into paper**: something is being written down.

One real spinner existed (`animate-spin rounded-full border-t-accent` in
`PlaceRevealOverlay.tsx`) and has been removed. If another appears, it is a regression.

## The primitive: `components/ui/Waiting.tsx`

Two exports, no hooks, no `"use client"` — the animation is pure CSS, so it drops into server
components (a `loading.tsx`, a suspense fallback) and client ones alike.

| Export | What |
|---|---|
| `Waiting` | The mark plus a label, stacked. `role="status" aria-live="polite"`, announced once. |
| `WaitingMark` | Three drops alone, `aria-hidden`. For a caller with its own layout — a button's inner flex row. Caller owns the announcement. |

And for full-screen waits, `components/ui/WaitingScene.tsx` — a bloom of warm light with ten motes
rising through it, behind the mark. A mark and a line of type alone is correct and still reads as
a utility; the rest of the book puts something alive on screen at every other quiet moment, so a
pause should look like the world carrying on rather than a process bar. It reuses the `mote-rise`
keyframe `Meadow` uses for the motes in the sunbeam, so a wait drifts at the same speed as
everything outside the window — but strictly `baseTokens` colours, never `gardenTokens`, since it
sits *over* the interface rather than behind it (`theming.md`).

Its mote table is a literal, never `Math.random()`: it renders inside components that
server-render, and random positions would reintroduce the hydration-mismatch class `useHydrated`
exists to prevent. It uses `motion-reduce:hidden` on the motes rather than relying on the
`ambient-` kill switch, which would freeze them at `opacity: 0` low on the screen — static specks
along the bottom edge, worse than none. Reduced motion keeps the bloom and the mark.

Callers must give the containing element `relative`, or the scene's `absolute inset-0` escapes to
the viewport.

`size` is `sm` \| `md` \| `lg` — intent, not pixels. Sizes live in one `SIZES` table in that file.

**Labels are story language**, like every other string in the book: "Finding somewhere…",
"Tucking it in…", "Getting there…", "Reading the compass…". Never "Loading…".

## The animation: `settling`, in `app/globals.css`

Three drops, staggered 0.16s apart via an inline `animation-delay` — the same
per-element-custom-property convention the ambient scene keyframes use. Staggered rather than
synchronised because three dots pulsing in unison read as one blinking object, where a sequence
reads as something being drawn.

1.4s period, against `developing`'s 2.4s. A skeleton can breathe slowly because nobody is waiting
*on* it; a mark that appears in response to a press has to acknowledge the press.

Named `ambient-settling` so it inherits the single `prefers-reduced-motion` kill switch at the
bottom of `globals.css` (`[class*="ambient-"]`), and — like `developing` — it **rests at full
opacity and zero offset**, so freezing it leaves three quiet ink drops rather than a row of
half-faded dots stuck mid-bounce.

## Route-level: `loading.tsx`

Next.js renders these instantly in place of the page and swaps the real one in when it streams.
Without one, a tap does nothing visible until the server answers, and a screen that does nothing
reads as broken rather than as loading.

Two tiers, and the first is better:

1. **A bespoke skeleton that mirrors the real page**, so nothing moves on the swap.
   `app/(app)/chapters/[slug]/loading.tsx` is the reference — read its header comment before
   writing another. It costs real effort and it has to be kept in step with the page (when
   `MemoryGrid` moved off CSS multi-column, this had to move with it or the skeleton's three
   balanced columns would have swapped into the real page's lopsided one).
2. **`components/ui/PageWaiting.tsx`** — the page's own title, already in place, and the mark
   underneath. For routes whose shape varies enough that a skeleton would be guessing: a browse
   grid whose length depends on filters, a detail page whose hero has no fixed height. A wrong
   skeleton is worse than none, because the content lands and everything jumps.

`PageWaiting`'s `title` must match the real page's `<h1>` **exactly**, and `maxWidth` must match
its `<main>`, or the title slides on the swap.

Two routes deliberately pass no title — `places/[slug]` and `bucket-list/[id]`. The name of the
place, or the words of the promise, *is* the page, and neither is known until `params` resolves on
the server. Printing "Places" there would tell the reader they arrived somewhere generic when they
tapped something specific, so those beats stay quiet.

### Coverage

| Route | Loading state |
|---|---|
| `chapters/[slug]` | Bespoke album skeleton |
| `places` | `PageWaiting` — "Reading the compass…" |
| `places/browse` | `PageWaiting` — "Gathering the map…" |
| `places/[slug]` | Mark only — "Getting there…" |
| `bucket-list` | `PageWaiting` — "Finding what we promised…" |
| `bucket-list/[id]` | Mark only — "Opening it…" |
| `vault` | `PageWaiting` — "Unlocking…" |
| `archive` | `PageWaiting` — "Looking through what we set aside…" |
| `settings` | `PageWaiting` — "One moment…" |

Still uncovered: `app/(app)/page.tsx` (home — the opening sequence is its own arrival beat and a
loading screen in front of it would step on that), `keeper/*` (keeper-only utility pages).

## The gap before `loading.tsx`: `components/nav/NavigationVeil.tsx`

A route's `loading.tsx` only appears once a navigation has **committed**. Every page here is
dynamic (they all read Supabase), so there is a window between the tap and the commit where
nothing moves and the old page still looks clickable — Vault → Bookshelf is the worst of them.

`NavigationVeil` covers that window from the click itself: a full-screen blurred veil with the
`Waiting` mark on it. It reads pending state from `useLinkStatus` (Next 15.3+), which **must be
rendered inside a `<Link>`** — which is why it is mounted from within `NavLink`'s children rather
than once at the layout. `NavLink` backs both the desktop row and `MobileNavMenu`, so one
insertion covers every header link.

Two details that are load-bearing:

- **The 450ms delay** (`.nav-veil` in `globals.css`) is the whole design. The veil starts at
  `opacity: 0` and animates in only after 450ms, so a prefetched or otherwise quick navigation
  unmounts it before a pixel is painted. A full-screen veil flashing on a fast tap is *strictly
  worse* than no veil — it draws the eye to something already gone by the time you look. The
  threshold started at 180ms and had to be raised for exactly that reason; if it needs tuning
  again, raise the delay rather than shortening the 350ms fade.
- **`pointer-events-none`**, because the veil is a descendant of the anchor that was just clicked
  and a click landing on it would re-trigger the same link.

`z-[60]` puts it above the reveal overlays (`z-50`) and the discovery layer (`z-40`) — a
navigation started from inside one of those should veil the whole screen, not hide behind the
thing it is leaving.

`veil-in` is deliberately **not** named `ambient-*`: the reduced-motion kill switch would freeze
it at `opacity: 0` and silently delete the feature for those readers. It animates opacity only,
with no movement, which is not what that preference is asking to be spared.

Not yet veiled: links that are not `NavLink` — chapter strips on the bookshelf, place cards,
"Explore every place". Same component works there; it just has to go inside each `<Link>`.

## In-place waits, not route waits

For an action inside a page that already exists, prefer the two things this codebase already
does, in this order:

1. **Optimistic state** — `useOptimistic`, as in `MemoryReactions` / `VaultReactions`. A reaction
   that appears instantly and reconciles later beats any indicator at all.
2. **The button's own label changes** — "Leave it here" → "Tucking it in…" (`MemoryComments`),
   "Add" → "One moment…" (`AddPromiseModal`), "Change their password" → "Changing…"
   (`PartnerPasswordForm`). The control that was pressed is where the answer belongs.

Reach for `Waiting` when neither fits: a panel with nothing in it yet, or a wait long enough that
a changed label isn't reassurance enough (`PlaceRevealOverlay`'s reveal).
