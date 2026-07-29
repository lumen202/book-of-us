"use client";

import { useOpeningActive } from "@/lib/opening-sequence/useOpeningActive";
import { useNightPreview } from "@/lib/night-preview/NightPreviewProvider";

/**
 * A one-tap twin of the night toggle on the Settings page, living in the
 * header instead of a page you have to navigate to. Same context, same
 * `localStorage` key — flipping either one flips both, since they share
 * `NightPreviewProvider`. The Settings row is left in place on purpose (see
 * `NightModeToggle`): redundant, but removing it would break the one place
 * a first-time visitor is likely to discover the feature at all.
 *
 * Hidden during the opening ceremony for the same reason `MobileNavMenu`
 * hides itself then — this sits in the same top-right corner as the
 * ceremony's own "Skip intro" button.
 */
export function NightModeIconToggle() {
  const { enabled, setEnabled } = useNightPreview();
  const openingActive = useOpeningActive();

  if (openingActive) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Turn off night view" : "See the garden at night"}
      title={enabled ? "Turn off night view" : "See the garden at night"}
      onClick={() => setEnabled(!enabled)}
      className="ink-legible flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted transition hover:bg-accent-muted/40 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {enabled ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3.4" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="9"
          y1="2.2"
          x2="9"
          y2="0.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          transform={`rotate(${deg} 9 9)`}
        />
      ))}
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M12.8 2.2A7.1 7.1 0 1 0 15.8 12.8 8.5 8.5 0 0 1 12.8 2.2Z" fill="currentColor" />
    </svg>
  );
}
