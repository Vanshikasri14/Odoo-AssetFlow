import type { AuditCycleState, AuditResult } from "@prisma/client";

export const CYCLE_STATE_LABEL: Record<AuditCycleState, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  closed: "Closed",
};

export const CYCLE_STATE_BADGE: Record<AuditCycleState, string> = {
  draft:
    "bg-zinc-100 text-zinc-600 ring-zinc-400/20 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-600/20",
  in_progress:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-500/30",
  closed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
};

export const RESULT_LABEL: Record<AuditResult, string> = {
  pending: "Pending",
  verified: "Verified",
  missing: "Missing",
  damaged: "Damaged",
};

export const RESULT_BADGE: Record<AuditResult, string> = {
  pending:
    "bg-zinc-100 text-zinc-500 ring-zinc-400/20 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-zinc-600/20",
  verified:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  missing: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
  damaged:
    "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
};
