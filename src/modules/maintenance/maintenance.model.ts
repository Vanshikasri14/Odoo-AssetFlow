import type { MaintenanceState, MaintenancePriority } from "@prisma/client";

export const STATE_LABEL: Record<MaintenanceState, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export const STATE_BADGE: Record<MaintenanceState, string> = {
  pending:
    "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  approved:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-500/30",
  rejected:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
  assigned:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  in_progress:
    "bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-950 dark:text-cyan-300 dark:ring-cyan-500/30",
  resolved:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  cancelled:
    "bg-zinc-100 text-zinc-500 ring-zinc-400/20 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-zinc-600/20",
};

export const PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  low: "bg-zinc-100 text-zinc-600 ring-zinc-400/20 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-600/20",
  medium:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-500/30",
  high: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  urgent: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
};
