"use client";

/**
 * Only reached if the root layout itself throws — the one case `(app)/error.tsx`
 * can't catch, because that boundary lives inside the layout that's now broken.
 * Next.js requires this to render its own `<html>`/`<body>`, so it can't lean on
 * `globals.css` tokens or fonts the way every other screen does. Deliberately a
 * bare fallback, not a themed scene: the point is that it always renders, even
 * when the rest of the app's machinery can't be trusted to.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          fontFamily: "Georgia, serif",
          background: "#fdf8f2",
          color: "#3a332c",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <p style={{ fontStyle: "italic", fontSize: "1.125rem" }}>
          This page is resting for a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "999px",
            border: "1px solid #c99a63",
            background: "transparent",
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
