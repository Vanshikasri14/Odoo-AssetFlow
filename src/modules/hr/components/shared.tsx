/**
 * Small shared bits for the HR screens, built on the team's design system
 * (`@/components/ui`). Nothing here re-implements a primitive — it only composes
 * them into the two patterns these three tabs repeat: a labelled field, and a
 * result banner.
 */
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/utils";

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
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      {children}
      {hint && !errors?.length && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
      )}
      {!!errors?.length && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[0]}</p>
      )}
    </div>
  );
}

/** Success / failure feedback from a server action. */
export function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role="status"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        error
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
      )}
    >
      {error ?? ok}
    </div>
  );
}

export function ActivePill({ active }: { active: boolean }) {
  return (
    <Badge
      className={
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30"
          : undefined
      }
      variant={active ? undefined : "secondary"}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
