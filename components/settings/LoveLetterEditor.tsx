"use client";

import { useActionState } from "react";
import { saveLoveLetter } from "@/app/(app)/settings/actions";
import type { LoveLetter } from "@/lib/relationship/types";

export function LoveLetterEditor({ initialLetter }: { initialLetter: LoveLetter | null }) {
  const [state, formAction, pending] = useActionState(saveLoveLetter, null);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-serif text-lg text-ink">The letter</span>
        <span className="text-sm text-ink-muted">
          Write your own for your partner&rsquo;s monthsary ceremony to open with, in place of the
          built-in one. Only they&rsquo;ll see it, when it plays for them.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="salutation" className="text-sm text-ink-muted">
          Salutation
        </label>
        <input
          id="salutation"
          name="salutation"
          type="text"
          required
          defaultValue={initialLetter?.salutation}
          placeholder="My habibi — you did this to me,"
          className="w-full border-b border-border bg-transparent py-1 font-serif text-lg italic text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm text-ink-muted">
          Body
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={4}
          defaultValue={initialLetter?.body}
          placeholder="One month ago I was a perfectly normal person…"
          className="w-full resize-none border-b border-border bg-transparent py-1 text-sm leading-relaxed text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signoff" className="text-sm text-ink-muted">
          Sign-off
        </label>
        <input
          id="signoff"
          name="signoff"
          type="text"
          required
          defaultValue={initialLetter?.signoff}
          placeholder="Yours, obviously —"
          className="w-full border-b border-border bg-transparent py-1 font-serif text-lg italic text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
        />
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
        {pending ? "Saving…" : "Save letter"}
      </button>
    </form>
  );
}
