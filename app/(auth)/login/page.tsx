"use client";

import { useActionState, useRef, useState } from "react";
import { login } from "./actions";

const DEV_LOGIN_EMAIL = "jdiniega202@gmail.com";
const DEV_LOGIN_PASSWORD = "7/5/2026";

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path
        d="M2.5 2.5l15 15M8.3 5.2C8.85 5.07 9.42 5 10 5c5.5 0 8.5 6 8.5 6-.4.8-1.2 2.05-2.4 3.2M6.1 6.9C3.7 8.2 1.5 10 1.5 10s3 6 8.5 6c1.05 0 2-.2 2.85-.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const canShowDevAutofill = process.env.NODE_ENV === "development";

  function autofillDevLogin() {
    if (!emailRef.current || !passwordRef.current) return;

    emailRef.current.value = DEV_LOGIN_EMAIL;
    passwordRef.current.value = DEV_LOGIN_PASSWORD;
    setShowPassword(false);
    passwordRef.current.focus();
  }

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
              ref={emailRef}
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
            <div className="relative">
              <input
                id="password"
                name="password"
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 pr-10 text-neutral-900 outline-none focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-500"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {canShowDevAutofill ? (
          <button
            type="button"
            onClick={autofillDevLogin}
            className="w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-900"
          >
            Autofill test account
          </button>
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
