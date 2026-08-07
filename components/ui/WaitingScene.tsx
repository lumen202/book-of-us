/**
 * The atmosphere behind a full-screen wait — warm light and a few motes rising
 * through it. Purely decorative; pair it with `Waiting` for the words.
 *
 * A wait that is only a mark and a line of type is *correct* and still reads as
 * a utility. What the rest of the book does at every other quiet moment is put
 * something alive on the screen — the swing still settling, motes in the sun,
 * fireflies over the meadow — so a pause in this app should look like the world
 * carrying on while you wait, not like a process bar. This is that, at the
 * smallest size it can be built: one bloom of light and ten specks in it.
 *
 * ## It borrows the scene's motion, not the scene's palette
 *
 * `mote-rise` is the same keyframe `Meadow` uses for the motes in the sunbeam
 * (`app/globals.css`), reused rather than reinvented so a wait drifts at the
 * same speed as everything outside the window. But the colours are
 * `baseTokens` only — `accent`, `accent-warm`, `surface` — never `gardenTokens`.
 * `theming.md` keeps the garden pigments off anything that isn't the painted
 * backdrop itself, and this sits over the interface rather than behind it.
 *
 * ## Deterministic, never random
 *
 * The mote table is a literal. Nothing here may call `Math.random()`: this
 * renders inside components that server-render, and a random position would
 * reintroduce exactly the hydration mismatch class that `useHydrated` exists to
 * prevent. Ten hand-set positions look no less scattered than ten random ones.
 */

/** left %, size px, opacity, drift px, duration s, delay s — spread by hand, not by RNG. */
const MOTES = [
  { left: 12, size: 6, opacity: 0.5, drift: 18, duration: 9, delay: 0 },
  { left: 24, size: 4, opacity: 0.38, drift: -14, duration: 11, delay: 1.4 },
  { left: 33, size: 8, opacity: 0.44, drift: 26, duration: 8.5, delay: 2.8 },
  { left: 41, size: 5, opacity: 0.32, drift: -8, duration: 12, delay: 0.7 },
  { left: 52, size: 7, opacity: 0.52, drift: 12, duration: 9.5, delay: 3.6 },
  { left: 60, size: 4, opacity: 0.36, drift: -22, duration: 10.5, delay: 1.9 },
  { left: 69, size: 9, opacity: 0.42, drift: 16, duration: 8, delay: 4.4 },
  { left: 78, size: 5, opacity: 0.34, drift: -12, duration: 11.5, delay: 2.2 },
  { left: 86, size: 6, opacity: 0.46, drift: 20, duration: 9.8, delay: 0.4 },
  { left: 94, size: 4, opacity: 0.3, drift: -16, duration: 12.5, delay: 3.1 },
] as const;

export function WaitingScene() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/*
       * One soft bloom behind the centre, where the mark sits — the light the
       * motes are rising through. Warm, and wide enough that its edge never
       * reads as a circle drawn on the screen.
       */}
      <span
        className="absolute left-1/2 top-1/2 block h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent-warm) 30%, transparent), color-mix(in srgb, var(--color-accent) 12%, transparent) 55%, transparent 72%)",
        }}
      />

      {/*
       * `motion-reduce:hidden` rather than letting the kill switch stop them:
       * `[class*="ambient-"]` freezes an animation at its `from` state, and
       * `mote-rise` starts at `opacity: 0` low on the screen — so frozen motes
       * would be a row of static specks along the bottom edge, which is worse
       * than no motes. Reduced motion gets the bloom and the mark, which is
       * the whole meaning without any of the movement.
       */}
      {MOTES.map((mote) => (
        <span
          key={mote.left}
          className="ambient-mote absolute block rounded-full motion-reduce:hidden"
          style={{
            left: `${mote.left}%`,
            bottom: "-4vh",
            height: mote.size,
            width: mote.size,
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-surface) 94%, transparent), color-mix(in srgb, var(--color-accent-warm) 40%, transparent) 70%, transparent)",
            opacity: mote.opacity,
            ["--mote-o" as string]: mote.opacity,
            ["--mote-drift" as string]: `${mote.drift}px`,
            animation: `mote-rise ${mote.duration}s linear infinite`,
            animationDelay: `${mote.delay}s`,
          }}
        />
      ))}
    </span>
  );
}
