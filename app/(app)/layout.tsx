import { CelebrationProvider } from "@/lib/celebration/CelebrationProvider";
import { CelebrationDayProvider } from "@/lib/celebration/CelebrationDayContext";
import { NightPreviewProvider } from "@/lib/night-preview/NightPreviewProvider";
import { ReducedMotionConfig } from "@/components/motion/ReducedMotionConfig";
import { AppHeader } from "@/components/nav/AppHeader";
import { StorybookSky } from "@/components/ambient/StorybookSky";
import { CelebrationDevToggle } from "@/components/dev/CelebrationDevToggle";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { isCelebrationDay } from "@/lib/celebration/isCelebrationDay";
import { getAppNow } from "@/lib/relationship/devClock";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Decided here because `isCurrentUserAdmin` is server-only and the toggle is
  // a client component. Hiding the widget is tidiness, not access control —
  // everything behind it is cosmetic (see the note in the component).
  const isAdmin = await isCurrentUserAdmin();

  // The same clock + same function `app/(app)/page.tsx` uses to decide
  // whether to fetch the look-back photos — see `CelebrationDayContext` for
  // why every `useCelebrating()` consumer needs to share this one answer
  // instead of asking the browser's own clock.
  const celebrationDay = isCelebrationDay(getAppNow());

  return (
    <CelebrationDayProvider value={celebrationDay}>
      <CelebrationProvider>
        <NightPreviewProvider>
          <ReducedMotionConfig>
            {/* Sits behind everything at -z-10 — the whole book takes place
                inside this painting. */}
            <StorybookSky />
            <AppHeader />
            {children}
            <CelebrationDevToggle isAdmin={isAdmin} />
          </ReducedMotionConfig>
        </NightPreviewProvider>
      </CelebrationProvider>
    </CelebrationDayProvider>
  );
}
