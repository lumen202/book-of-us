import { CelebrationProvider } from "@/lib/celebration/CelebrationProvider";
import { ReducedMotionConfig } from "@/components/motion/ReducedMotionConfig";
import { AppHeader } from "@/components/nav/AppHeader";
import { CelebrationDevToggle } from "@/components/dev/CelebrationDevToggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CelebrationProvider>
      <ReducedMotionConfig>
        <AppHeader />
        {children}
        <CelebrationDevToggle />
      </ReducedMotionConfig>
    </CelebrationProvider>
  );
}
