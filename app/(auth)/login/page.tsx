"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-medium text-neutral-900">The Book of Us</h1>
          <p className="text-sm text-neutral-500">Come in.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm text-neutral-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm text-neutral-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500"
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
        >
          {pending ? "Opening…" : "Open the book"}
        </button>
      </form>
    </main>
  );
}
