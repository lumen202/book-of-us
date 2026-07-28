"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { unlockVault } from "@/app/(app)/vault/actions";
import { VaultGrid } from "@/components/vault/VaultGrid";

/**
 * The vault's front door. Re-entering your own login password unlocks it for
 * the rest of this tab — a fresh tab or a reload asks again, since nothing
 * persists the unlocked state anywhere (no storage, just React state that
 * resets on remount). See `unlockVault`'s own comment for why this is a UX
 * gate rather than a second security boundary.
 */
export function VaultGate() {
  const [state, formAction, pending] = useActionState(unlockVault, null);
  const [showPassword, setShowPassword] = useState(false);

  if (state?.ok) {
    return <VaultGrid initialItems={state.items} currentUserId={state.currentUserId} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6">
      <Link
        href="/"
        className="ink-legible absolute left-6 top-8 w-fit text-sm text-ink-muted underline decoration-border underline-offset-4 transition hover:text-ink"
      >
        &larr; Back to the shelf
      </Link>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="ink-legible text-[11px] uppercase tracking-[0.3em] text-accent">Locked</span>
        <h1 className="ink-legible font-serif text-3xl leading-tight text-ink">
          This page needs your password.
        </h1>
      </div>

      {/* A card, not bare on the scene — every other password form in this app
          (ChangePasswordForm, PartnerPasswordForm) lives inside a bg-surface
          panel, and a bordered input is a bad fit for .ink-legible's halo
          trick. Without the card the label and input text go dark-on-dark
          the moment Night View is on. */}
      <form
        action={formAction}
        className="flex w-full flex-col gap-4 rounded-panel border border-border bg-surface p-7 text-left"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vault-password" className="text-sm text-ink-muted">
            Password
          </label>
          <div className="relative">
            <input
              id="vault-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              autoFocus
              className="w-full border-b border-border bg-transparent py-1 pr-12 font-serif text-lg text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 cursor-pointer text-xs uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {state && !state.ok && (
          <p role="alert" className="text-sm text-red-600">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full cursor-pointer rounded-full bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-surface transition hover:brightness-95 disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {pending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
