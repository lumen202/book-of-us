import { CelebrationProvider } from "@/lib/celebration/CelebrationProvider";
import { ReducedMotionConfig } from "@/components/motion/ReducedMotionConfig";
import { AppHeader } from "@/components/nav/AppHeader";
import { StorybookSky } from "@/components/ambient/StorybookSky";
import { CelebrationDevToggle } from "@/components/dev/CelebrationDevToggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CelebrationProvider>
      <ReducedMotionConfig>
        {/* Sits behind everything at -z-10 — the whole book takes place
            inside this painting. */}
        <StorybookSky />
        <AppHeader />
        {children}
        <CelebrationDevToggle />
      </ReducedMotionConfig>
    </CelebrationProvider>
  );
}
