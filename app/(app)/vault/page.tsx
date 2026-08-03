import { getActiveProjectFromCookies } from "@/lib/supabase/project.server";
import { VaultGate } from "@/components/vault/VaultGate";

/**
 * Reachable by either account (per the app's usual "no per-user data" model)
 * but gated by re-entering your own password — see `VaultGate`/`unlockVault`
 * for why that's a step-up UX gate, not a second security boundary.
 *
 * `isDemo` is resolved here (a Server Component can read `bou_project`
 * directly) and handed down as a prop — `VaultGate` is a client component and
 * has no server-only cookie access of its own, same reasoning as the
 * `isAdmin` prop `AppHeader` already threads down to its client nav menus.
 */
export default async function VaultPage() {
  const isDemo = (await getActiveProjectFromCookies()) === "demo";

  return (
    <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <VaultGate isDemo={isDemo} />
    </main>
  );
}
