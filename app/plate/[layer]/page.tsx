import { notFound } from "next/navigation";

import { BigTree } from "@/components/ambient/paint/BigTree";
import { FramingBoughs } from "@/components/ambient/paint/FramingBoughs";
import { FarRange, NearHills } from "@/components/ambient/paint/HillRange";
import { LightRays } from "@/components/ambient/paint/LightRays";
import { SkyLayer, SunGlow } from "@/components/ambient/paint/Sky";
import { PLATES, type PlateId } from "@/lib/ambient/plates";
import { PlateStage } from "./PlateStage";

/**
 * The easel the bake script photographs. Development only.
 *
 * Renders exactly one depth band from `PLATES` — on nothing, at full painting
 * fidelity — so `scripts/bake-plates.ts` can screenshot it to a transparent
 * PNG. See `lib/ambient/plates.ts` for what the plates are and why the scene is
 * split into bands this way.
 *
 * ## Why this route is outside `(app)` and outside the auth matcher
 *
 * It has to be reachable with nothing but `npm run dev`. The alternative was to
 * put it behind the session like every other route and have the baker log in as
 * the demo account the way `scripts/perf-trace.ts` does — which works, but ties
 * "can I re-bake the painting?" to "are the Supabase demo credentials set up on
 * this machine?", and repainting the garden has nothing to do with either.
 * `proxy.ts` excludes `/plate` for that reason.
 *
 * The exemption is safe because of the guard below: in a production build this
 * route is a 404, so the public surface it adds is zero. Keep both — the guard
 * is the actual protection and the matcher exclusion is only convenience.
 *
 * Note for whoever next edits that matcher: this project has already been bitten
 * once by a matcher change with no visible failure signal (see the manifest/icon
 * incident in the matcher's own comment). After changing it, check this route
 * from a client with no session — `curl -I http://localhost:3000/plate/sky`
 * should be `200` in dev, and an authenticated browser tab is precisely the test
 * that cannot tell you that.
 */
const LAYERS: Record<PlateId, React.ReactNode> = {
  sky: (
    <>
      <SkyLayer />
      <SunGlow />
    </>
  ),
  far: <FarRange />,
  near: <NearHills />,
  tree: (
    <>
      <BigTree />
      <LightRays />
    </>
  ),
  boughs: <FramingBoughs />,
};

export default async function PlatePage({
  params,
}: {
  params: Promise<{ layer: string }>;
}) {
  // A production build must not serve this. `NODE_ENV` is inlined at build
  // time, so this is effectively a compile-time 404 rather than a runtime check.
  if (process.env.NODE_ENV === "production") notFound();

  const { layer } = await params;
  const spec = PLATES.find((plate) => plate.id === layer);
  if (!spec) notFound();

  return <PlateStage>{LAYERS[spec.id]}</PlateStage>;
}
