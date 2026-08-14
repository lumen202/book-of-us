"use client";

import { useSyncExternalStore } from "react";

import { parallax } from "@/lib/ambient/depth";
import { platePath, type PlateSpec } from "@/lib/ambient/plates";

/**
 * One baked depth band, standing in for the SVG layers it was painted from.
 *
 * See `lib/ambient/plates.ts` for why the scene is baked at all and why it is
 * cut into bands. This component is only the presentation: a `<picture>` with a
 * portrait composition and a landscape one, carrying the same `data-parallax`
 * its SVG predecessor did so the depth cue is bit-for-bit unchanged.
 *
 * ## Portrait sources are wired up; the portrait *art* is not done
 *
 * The `(orientation: portrait)` sources exist and resolve, so the delivery
 * mechanism is right, and it is `media` rather than `sizes` because this is
 * meant to be art direction rather than resolution switching.
 *
 * But the plates behind them are currently the landscape scene baked at a tall
 * viewport, and `preserveAspectRatio="none"` *stretches* that scene rather than
 * re-composing it — every object in the portrait frame is vertically distorted
 * today, and most of the frame is empty sky. See the correction in
 * `lib/ambient/plates.ts` for what the real fix requires.
 *
 * When an authored portrait composition lands, nothing in this component has to
 * change; only the images behind these two `<source>` elements do.
 *
 * ## Why night is mounted late rather than rendered underneath
 *
 * `NightSky` solves the same problem by always rendering and letting CSS reveal
 * it, because whether today is the 5th is a client-only question the server must
 * not try to answer. That works there because it is a handful of divs. Here it
 * would mean every reader downloading and decoding a second full-viewport image
 * they will not see on 30 days out of 31.
 *
 * So the day plate renders on the server and the night plate mounts after
 * hydration, gated on `mounted` so the first client render still matches the
 * server's. `useCelebrating` is deliberately not read straight into JSX — its
 * own doc comment notes that its lazy initializer reads `window`, so it is only
 * hydration-safe when consumed after mount, which is what the gate below does.
 *
 * The cross-fade that results on the 5th is wanted: the garden going to night
 * is supposed to be an event, and having it arrive a beat after the page does
 * reads as dusk falling rather than as a different page loading.
 */
/**
 * Whether the garden is currently painted for night.
 *
 * Reads the two attributes on `<html>` that `globals.css` keys the night
 * palette off, rather than asking the providers that set them. That is
 * deliberate, and it is the fix for a real regression: the first version of
 * this component asked `useCelebrating()` only, so the Settings night-preview
 * toggle — which is a *separate* attribute on purpose (`data-night-preview`,
 * see `NightPreviewProvider`, because `data-celebration` also drives confetti,
 * ceremony copy and the look-back fetch) — moved every live layer to night
 * while these baked plates stayed in full daylight.
 *
 * Keying off the DOM makes that class of bug structurally impossible: the
 * plates now switch on exactly the condition the stylesheet switches on, so a
 * third way of reaching night (a future time-of-day system, a dev override)
 * cannot desynchronise them again without also failing to tint the live
 * layers, which is loud rather than silent.
 *
 * Server snapshot is `false` — the server must not try to answer whether today
 * is the 5th (the same reason `NightSky` renders always and lets CSS reveal
 * it), and a `MutationObserver` keeps the client honest after hydration.
 */
function subscribeToSceneLight(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-celebration", "data-night-preview"],
  });
  return () => observer.disconnect();
}

function readSceneIsNight(): boolean {
  const root = document.documentElement;
  return (
    root.getAttribute("data-celebration") === "true" ||
    root.getAttribute("data-night-preview") === "true"
  );
}

function useSceneIsNight(): boolean {
  return useSyncExternalStore(subscribeToSceneLight, readSceneIsNight, () => false);
}

export function Plate({ spec, priority = false }: { spec: PlateSpec; priority?: boolean }) {
  const showNight = useSceneIsNight();

  return (
    <div className="absolute inset-0" {...parallax(spec.travel)}>
      {/*
       * The day plate is *taken away* under the night one rather than left
       * beneath it. Plates are transparent PNGs, so a night plate laid over a
       * day plate replaces the day art only where the night art happens to be
       * opaque — everywhere else both paintings show at once. That is what put
       * the sun's shafts in a night sky: the night `tree` plate carries no rays
       * (they are faded out at night before the bake ever photographs them), so
       * the day plate's rays underneath it were what the reader was seeing.
       *
       * See `plate-daylight-out` in globals.css for why it holds full opacity
       * and then cuts, rather than cross-fading against the incoming plate.
       */}
      <div
        className="absolute inset-0"
        style={showNight ? { animation: "plate-daylight-out 1200ms ease-out both" } : undefined}
      >
        <PlatePicture spec={spec} light="day" priority={priority} />
      </div>
      {showNight && (
        <div
          className="absolute inset-0"
          style={{ animation: "plate-nightfall 1200ms ease-out both" }}
        >
          <PlatePicture spec={spec} light="night" priority={false} />
        </div>
      )}
    </div>
  );
}

function PlatePicture({
  spec,
  light,
  priority,
}: {
  spec: PlateSpec;
  light: "day" | "night";
  priority: boolean;
}) {
  return (
    <picture>
      <source
        media="(orientation: portrait)"
        type="image/avif"
        srcSet={platePath(spec.id, light, "portrait", "avif")}
      />
      <source
        media="(orientation: portrait)"
        type="image/webp"
        srcSet={platePath(spec.id, light, "portrait", "webp")}
      />
      <source type="image/avif" srcSet={platePath(spec.id, light, "landscape", "avif")} />
      <source type="image/webp" srcSet={platePath(spec.id, light, "landscape", "webp")} />
      <img
        // `alt=""`, not a description: the scene root is already `aria-hidden`,
        // and the painting is atmosphere rather than content.
        alt=""
        src={platePath(spec.id, light, "landscape", "webp")}
        /*
         * `object-cover` so a viewport whose aspect sits between the two baked
         * compositions crops rather than distorts. The bands are painted with
         * their subject away from the edges (see the "frame is a room" rule in
         * StorybookSky) precisely so a crop costs nothing.
         */
        className="h-full w-full object-cover"
        /*
         * The sky band is the largest painted thing above the fold and is
         * usually the LCP element, so it is fetched eagerly and decoded
         * synchronously; every band behind it can wait its turn. `draggable`
         * off because this is scenery and a drag ghost of half a hillside is a
         * strange thing to hand someone.
         */
        fetchPriority={priority ? "high" : "low"}
        decoding={priority ? "sync" : "async"}
        loading="eager"
        draggable={false}
      />
    </picture>
  );
}
