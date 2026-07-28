import Link from "next/link";
import { NightModeToggle } from "@/components/settings/NightModeToggle";

/**
 * Password-changing lives in the Keeper menu now, not here — see
 * `components/nav/AdminMenu.tsx`. This page is the one everyone can reach.
 */
export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 pb-24 pt-8">
      <Link
        href="/"
        className="ink-legible w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the shelf
      </Link>

      <header className="flex flex-col gap-2">
        <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Settings</span>
        <h1 className="ink-legible font-serif text-4xl leading-tight text-ink">A few small things.</h1>
      </header>

      <section className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-7">
        <NightModeToggle />
      </section>
    </main>
  );
}
