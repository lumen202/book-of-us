"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addPlaceToBucketList, toggleSavePlace } from "@/app/(app)/places/actions";

/**
 * Wishlist / Visited / "we should go" — the feature's whole Favorites
 * surface. Optimistic local state (flips immediately, reconciled by
 * `router.refresh()` once the server action resolves) so a tap on a
 * destination reveal never waits on a round trip to feel done — same
 * `useTransition` + `router.refresh()` shape as `BucketList.tsx`.
 */
export function SaveActions({
  slug,
  initialWishlisted,
  initialVisited,
}: {
  slug: string;
  initialWishlisted: boolean;
  initialVisited: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [visited, setVisited] = useState(initialVisited);
  const [addedToBucketList, setAddedToBucketList] = useState(false);

  function toggle(list: "wishlist" | "visited") {
    const next = list === "wishlist" ? !wishlisted : !visited;
    if (list === "wishlist") setWishlisted(next);
    else setVisited(next);

    startTransition(async () => {
      try {
        await toggleSavePlace(slug, list, next);
        router.refresh();
      } catch {
        // Revert on failure — a save that silently didn't happen is worse
        // than a save that visibly bounces back.
        if (list === "wishlist") setWishlisted(!next);
        else setVisited(!next);
      }
    });
  }

  function addToBucketList() {
    setAddedToBucketList(true);
    startTransition(async () => {
      try {
        await addPlaceToBucketList(slug);
        router.refresh();
      } catch {
        setAddedToBucketList(false);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.2em]">
      <button
        type="button"
        onClick={() => toggle("wishlist")}
        aria-pressed={wishlisted}
        className={`transition hover:text-accent ${wishlisted ? "text-accent" : "text-ink-muted"}`}
      >
        {wishlisted ? "On the wishlist" : "Save to wishlist"}
      </button>
      <button
        type="button"
        onClick={() => toggle("visited")}
        aria-pressed={visited}
        className={`transition hover:text-accent ${visited ? "text-accent" : "text-ink-muted"}`}
      >
        {visited ? "Marked visited" : "Mark as visited"}
      </button>
      <button
        type="button"
        onClick={addToBucketList}
        disabled={addedToBucketList}
        className="text-ink-muted transition hover:text-accent disabled:text-accent"
      >
        {addedToBucketList ? "Added to the list" : "Add to bucket list"}
      </button>
    </div>
  );
}
