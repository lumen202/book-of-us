# 2026-07-28 — Ambient life density: the stagger, not the cadence

## What prompted this

Owner asked to "add some birds to the backdrop on normal days, like the stars on celebration days."

**Birds already existed**, in two forms: scheduled crossings (`useAmbientLife`, `bird` kind) and the
two always-rendered static flocks in `DistantFlock`. On checking, the owner confirmed they read
fine — the real complaint was that the garden as a whole felt underpopulated, which made any one
creature hard to notice.

So: no new creature, no new component. A tuning change to `lib/ambient/useAmbientLife.ts`.

## The diagnosis — steady state was fine, the cold start was not

`duration / mean interval` gives how many of each kind are on screen at once. Before, that summed
to **~6.6 concurrent**, which sounds populated. It didn't look it, for two reasons, and only the
second one was actually fixable:

1. Most of those six are small, faint and deliberately near the edges (a ladybug at 84–94vh is
   *meant* to go unnoticed). Working as designed — not touched.
2. **Nothing reached that steady state for the first minute.** The staggered first appearances had
   a bird waiting 19–37s for its first crossing, a dragonfly 52–86s, a firefly 61–101s. Plenty of
   visits are shorter than that. The garden many arrivals actually saw was two petals and a
   butterfly.

The stagger was the bug. The cadence was a contributing factor, not the cause.

## What changed

- **First delays cut to roughly a third.** Whole cast now appears at least once inside ~40s
  (petal 1–4s, butterfly 2–6s, bee 5–12s, bird 6–15s, … ladybug 30–60s). Same arrival *order* —
  the rare things still hold back, because a ladybug in the first two seconds spends the one detail
  most visitors are never meant to consciously notice.
- **Cadences shortened ~1.5x** (e.g. bird 24–43s → 15–29s). Concurrency ~6.6 → ~10. Still no ratios
  that are multiples of each other, so the kinds don't drift into sync — that property was the
  reason the original numbers looked arbitrary, and it was preserved deliberately.
- **`MAX_CONCURRENT` 9 → 14, but only on `(pointer: fine)`.** New `MAX_CONCURRENT_TOUCH = 9` keeps
  phones at their previous density. Each creature carries an infinite wing animation, and on touch
  they run over a scene that has already surrendered its parallax and two of its three paper passes
  to stay smooth. Desktop can afford the fuller garden; the phone shouldn't be asked to.

Per-kind rarity is unchanged in spirit: no single kind exceeds ~2 concurrent, so a bird is still an
event. What increased is how many *kinds* are present simultaneously, which is what "inhabited"
actually reads as.

## Deliberately not done

- **No opacity or scale changes.** Owner confirmed the birds themselves read fine; raising opacity
  would have been solving a problem that wasn't reported, at the cost of the aerial-perspective
  rule in `painted-world.md` (distant things are faint *because* they're distant).
- **No new creature kinds.** The node budget is real and the cast is already eight.
- **Daytime birds still fly on celebration nights.** `DistantFlock` is always rendered and the
  scheduler keeps spawning birds on the 5th, so the night sky has both stars and birds in it. That
  is arguably wrong — the sun sets, the lanterns light, but the birds never roost — and it would be
  a one-line CSS fade in the `data-celebration` block, mirroring `.ambient-sun`. Left alone because
  it wasn't asked for and it is a real art-direction call, not an oversight to quietly fix.

## What the next session should watch out for

- If the garden now feels *busy* rather than alive, the first lever is `MAX_CONCURRENT` (14), not
  the cadences — the cap is what bounds the worst case, and the cadences are what keep the rhythm
  unlearnable. Lower the cap first.
- The two caps must stay split. Collapsing them back to one number reintroduces the mobile cost
  that the `(pointer: coarse)` work in the backdrop-compositing session was spent removing.
- Untested on a real phone this session — desktop only. Verify frame rate on Android before
  assuming the touch cap is doing enough.
