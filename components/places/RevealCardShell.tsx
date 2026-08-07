/**
 * The reveal's actual visual card — solid `bg-surface`, border, rounded
 * corners, shadow. Shared by `PlaceRevealCard` (the result) and
 * `PlaceRevealOverlay`'s loading state (the wait before it), so both look
 * like the same object rather than the loading spinner floating bare and
 * the result suddenly gaining a card underneath it.
 *
 * This card is what makes text legible over the ambient backdrop at all —
 * `PlaceRevealCard` used to have no background of its own and relied
 * entirely on the modal it happened to be opened inside supplying one via
 * `PlaceRevealOverlay`'s panel. That meant every place it was rendered
 * *without* that modal (Daily Pick, inline on the page) sat directly on
 * `StorybookSky`'s painted scene with nothing behind it — legible over a
 * plain sky, unreadable over the meadow's own colour and texture. Giving the
 * card its own background here means it looks right in both contexts by
 * construction, not by every call site remembering to wrap it.
 */
export function RevealCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="scene-card w-full max-w-md rounded-[1.75rem] border border-border bg-surface p-7 text-center shadow-[0_20px_40px_-24px_rgba(76,59,48,0.45)]">
      {children}
    </div>
  );
}
