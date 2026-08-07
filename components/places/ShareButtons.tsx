"use client";

import { useState } from "react";

/**
 * Copy Link plus the native share sheet where it exists — deliberately not a
 * hand-built Instagram-story-image generator or a from-scratch QR encoder.
 * `navigator.share` already reaches Messenger/Instagram/Twitter/X on every
 * platform that actually supports it, correctly, via the OS's own share UI;
 * building a bespoke canvas renderer per platform on top of that would be
 * a second, worse version of something the browser already does well. See
 * "Deliberately out of scope" in `docs/agent/codebase-map/places.md`.
 */
export function ShareButtons({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  // Resolved at click time, not render time — this component is used from
  // both client-only modals and a plain server-rendered detail page, and
  // `window` only exists once either has actually mounted in a browser.
  function absoluteUrl() {
    return `${window.location.origin}${path}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable — the link is still
      // selectable text in the address bar; nothing else useful to do here.
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: `Somewhere to go: ${title}`, url: absoluteUrl() });
    } catch {
      // The user cancelled the share sheet — not an error worth surfacing.
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={copyLink}
        className="text-[11px] uppercase tracking-[0.2em] text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={nativeShare}
          className="text-[11px] uppercase tracking-[0.2em] text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
        >
          Share
        </button>
      )}
    </div>
  );
}
