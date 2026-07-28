import { VaultGate } from "@/components/vault/VaultGate";

/**
 * Reachable by either account (per the app's usual "no per-user data" model)
 * but gated by re-entering your own password — see `VaultGate`/`unlockVault`
 * for why that's a step-up UX gate, not a second security boundary.
 */
export default function VaultPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <VaultGate />
    </main>
  );
}
