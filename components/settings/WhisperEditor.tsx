"use client";

import { useActionState } from "react";
import { saveWhisper } from "@/app/(app)/settings/actions";

const PLACEHOLDER = [
  "A month ago you had no idea what you were signing up for.",
  "Too late now, my habibi.",
  "I'm keeping you — scammer and all.",
  "I love you.",
].join("\n");

export function WhisperEditor({ initialLines }: { initialLines: string[] | null }) {
  const [state, formAction, pending] = useActionState(saveWhisper, null);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-serif text-lg text-ink">The whisper</span>
        <span className="text-sm text-ink-muted">
          Spoken one line at a time, between the photos and the greeting. One line per line —
          keep each one short enough to land in a breath.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="lines" className="text-sm text-ink-muted">
          Lines
        </label>
        <textarea
          id="lines"
          name="lines"
          required
          rows={5}
          defaultValue={initialLines?.join("\n")}
          placeholder={PLACEHOLDER}
          className="w-full resize-none border-b border-border bg-transparent py-1 font-serif text-base italic leading-relaxed text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
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
        {pending ? "Saving…" : "Save whisper"}
      </button>
    </form>
  );
}
