"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FullLogo } from "@/components/brand/logo";
import { CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "../auth.actions";

const FIELD =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 " +
  "placeholder:text-zinc-400 outline-none transition " +
  "focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <div className="mb-7">
          <FullLogo className="w-52" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Forgot password</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          We&apos;ll let your administrator know, and they&apos;ll issue you a new password.
        </p>
      </div>

      {state?.ok ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Request sent</p>
              <p className="mt-1 text-sm text-emerald-800">{state.ok}</p>
            </div>
          </div>
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="login" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="login"
              name="login"
              type="email"
              autoComplete="email"
              required
              disabled={pending}
              className={FIELD}
              placeholder="you@company.com"
            />
            {state?.fieldErrors?.login && (
              <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.login[0]}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Sending…" : "Notify my administrator"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-700"
        >
          Back to sign in
        </Link>
      </p>

      <p className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-xs leading-relaxed text-zinc-500">
        <strong className="font-medium text-zinc-700">Why not an email link?</strong> No mail server
        is configured here — and minting a reset link that anyone who knows your address could use
        would be an account-takeover hole. Requests go to the people who administer accounts
        instead.
      </p>
    </div>
  );
}
