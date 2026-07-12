"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FullLogo } from "@/components/brand/logo";
import type { AuthFormState } from "../auth.schema";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

const FIELD =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 " +
  "placeholder:text-zinc-400 outline-none transition " +
  "focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-xs text-red-600">{messages[0]}</p>;
}

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <div className="mb-7">
          <FullLogo className="w-52" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {isSignup ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          {isSignup
            ? "New accounts start as Employees. Your administrator can grant further access."
            : "Enter your credentials to continue."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {isSignup && (
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              defaultValue={state?.values?.name}
              disabled={pending}
              className={FIELD}
              placeholder="Priya Sharma"
            />
            <FieldError messages={state?.fieldErrors?.name} />
          </div>
        )}

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
            defaultValue={state?.values?.login}
            disabled={pending}
            className={FIELD}
            placeholder="you@company.com"
          />
          <FieldError messages={state?.fieldErrors?.login} />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Password
          </label>
          {!isSignup && (
            <Link
              href="/forgot-password"
              className="float-right -mt-6 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
            >
              Forgot password?
            </Link>
          )}
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            disabled={pending}
            className={FIELD}
            placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          />
          <FieldError messages={state?.fieldErrors?.password} />
        </div>

        {/*
          There is no role selector here, and there never will be. The signup
          action does not read one. See auth.schema.ts.
        */}

        {state?.error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-700"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>

      {!isSignup && (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
          <p className="mb-2 text-xs font-medium text-zinc-600">Demo accounts</p>
          <dl className="space-y-1 text-xs text-zinc-500">
            {[
              ["admin@assetflow.io", "Admin"],
              ["manager@assetflow.io", "Asset Manager"],
              ["priya@assetflow.io", "Employee"],
            ].map(([email, role]) => (
              <div key={email} className="flex justify-between gap-3">
                <code className="font-mono text-zinc-700">{email}</code>
                <span>{role}</span>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-zinc-400">
            Password: <code className="font-mono">assetflow123</code>
          </p>
        </div>
      )}
    </div>
  );
}
