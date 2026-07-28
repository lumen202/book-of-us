"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { changePartnerPassword } from "@/app/(app)/settings/actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function PartnerPasswordForm({ partnerEmail }: { partnerEmail: string | null }) {
  const [state, formAction, pending] = useActionState(changePartnerPassword, null);
  const [showNew, setShowNew] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingFormData(new FormData(event.currentTarget));
  }

  function confirmChange() {
    if (!pendingFormData) return;
    startTransition(() => formAction(pendingFormData));
    setPendingFormData(null);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="partnerNewPassword" className="text-sm text-ink-muted">
            New password{partnerEmail ? ` for ${partnerEmail}` : ""}
          </label>
          <div className="relative">
            <input
              id="partnerNewPassword"
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
              className="absolute inset-y-0 right-0 text-xs uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
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
          className="w-fit rounded-full bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-surface transition hover:brightness-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {pending ? "Changing…" : "Change their password"}
        </button>
      </form>

      {pendingFormData && (
        <ConfirmDialog
          title="Change your partner's password?"
          body="They'll need the new password next time they sign in — make sure you tell them."
          confirmLabel="Yes, change it"
          busy={pending}
          onConfirm={confirmChange}
          onCancel={() => setPendingFormData(null)}
        />
      )}
    </>
  );
}
