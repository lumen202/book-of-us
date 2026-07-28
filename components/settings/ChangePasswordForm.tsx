"use client";

import { useActionState, useState } from "react";
import { changeMyPassword } from "@/app/(app)/settings/actions";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeMyPassword, null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className="text-sm text-ink-muted">
          Current password
        </label>
        <div className="relative">
          <input
            id="currentPassword"
            name="currentPassword"
            type={showCurrent ? "text" : "password"}
            required
            autoComplete="current-password"
            className="w-full border-b border-border bg-transparent py-1 pr-12 font-serif text-lg text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((value) => !value)}
            className="absolute inset-y-0 right-0 cursor-pointer text-xs uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
          >
            {showCurrent ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm text-ink-muted">
          New password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full border-b border-border bg-transparent py-1 pr-12 font-serif text-lg text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowNew((value) => !value)}
            className="absolute inset-y-0 right-0 cursor-pointer text-xs uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
          >
            {showNew ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {state && (
        <p role="alert" className={`text-sm ${state.status === "error" ? "text-red-600" : "text-accent"}`}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit cursor-pointer rounded-full bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-surface transition hover:brightness-95 disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
