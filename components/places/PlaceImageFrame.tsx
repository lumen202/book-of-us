import Image from "next/image";
import type { PlaceImage } from "@/lib/places/types";

/**
 * The one place a `PlaceImage` becomes an `<Image>` — every card, hero and
 * gallery tile in the feature goes through this, so the blur-up placeholder,
 * the Commons credit line and the `sizes` contract only need to be right
 * once. See `lib/places/images.ts` for the provider-swap seam this sits on.
 *
 * `unoptimized` — these are already Commons thumbnails capped at 1600px wide
 * by `scripts/build-places.ts`, not raw multi-megabyte originals, so there is
 * nothing left for Next's own Image Optimization API to usefully resize.
 * Skipping it means the browser fetches `upload.wikimedia.org` directly
 * instead of round-tripping through the optimizer, which removes a whole
 * class of failure this feature doesn't need to carry (optimizer cold
 * starts, upstream rate-limiting on the proxy's own fetch, `remotePatterns`
 * misconfiguration) for content that was never going to benefit from being
 * re-encoded a second time.
 */
export function PlaceImageFrame({
  image,
  sizes,
  fill = true,
  priority = false,
  className,
  creditPlacement = "none",
}: {
  image: PlaceImage;
  sizes: string;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  /** Whether — and where — to print the Commons credit line. Detail pages want it; small cards don't have room. */
  creditPlacement?: "none" | "corner";
}) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={image.url}
        alt={image.alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        unoptimized
        placeholder={image.blurDataUrl ? "blur" : "empty"}
        blurDataURL={image.blurDataUrl}
        className="object-cover"
      />
      {creditPlacement === "corner" && (
        <a
          href={image.credit.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="absolute bottom-1.5 right-1.5 rounded-full bg-ink/45 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-surface backdrop-blur-sm transition hover:bg-ink/70"
        >
          {image.credit.artist ? `Photo: ${image.credit.artist}` : "Photo credit"}
        </a>
      )}
    </div>
  );
}
