import type { MaintenanceState, MaintenancePriority } from "@prisma/client";
import { statusPill } from "@/components/ui/badge";

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
  pending: statusPill("amber"),
  approved: statusPill("blue"),
  rejected: statusPill("red"),
  assigned: statusPill("violet"),
  in_progress: statusPill("cyan"),
  resolved: statusPill("emerald"),
  cancelled: statusPill("zinc"),
};

export const PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  low: statusPill("zinc"),
  medium: statusPill("blue"),
  high: statusPill("amber"),
  urgent: statusPill("red"),
};
