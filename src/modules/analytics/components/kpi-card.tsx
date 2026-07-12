import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";

/**
 * A single KPI tile.
 *
 * `tone="alert"` is reserved for numbers that mean someone has to DO something —
 * overdue returns, pending approvals. If everything is styled as urgent, nothing
 * is, so the alert tone only kicks in when the value is actually non-zero.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  hint?: string;
  tone?: "default" | "alert";
}) {
  const alert = tone === "alert" && value > 0;

  const body = (
    <div
      className={cn(
        "group relative h-full rounded-lg border bg-white p-4 transition-colors dark:bg-zinc-950",
        alert
          ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
          : "border-zinc-200 dark:border-zinc-800",
        href && "hover:border-zinc-300 dark:hover:border-zinc-700",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-xs font-medium",
            alert ? "text-red-700 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400",
          )}
        >
          {label}
        </p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            alert ? "text-red-500" : "text-zinc-300 dark:text-zinc-600",
          )}
        />
      </div>

      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          alert ? "text-red-700 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50",
        )}
      >
        {value}
      </p>

      {hint && (
        <p
          className={cn(
            "mt-0.5 text-xs",
            alert ? "text-red-600/80 dark:text-red-400/80" : "text-zinc-400",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
