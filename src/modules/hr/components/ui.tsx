/**
 * Local presentational helpers for the HR screens.
 *
 * Deliberately NOT in src/components/ui — that folder belongs to Dev B and is
 * frozen. These live here so the two of us never touch the same file. Once the
 * shared design system lands, these are a drop-in swap.
 */
import type { ReactNode } from "react";

export const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 outline-none transition focus:border-slate-900 " +
  "focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50 disabled:opacity-60";

export const BTN =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-3.5 py-2 text-sm " +
  "font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

export const BTN_GHOST =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 " +
  "text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  errors,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  errors?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !errors?.length && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {!!errors?.length && <p className="mt-1 text-xs text-red-600">{errors[0]}</p>}
    </div>
  );
}

export function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role="status"
      className={
        error
          ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      }
    >
      {error ?? ok}
    </div>
  );
}

export function Pill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
          : "bg-slate-100 text-slate-500 ring-slate-400/20"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
