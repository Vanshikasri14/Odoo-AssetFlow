import type { AuditCycleState, AuditResult } from "@prisma/client";
import { statusPill } from "@/components/ui/badge";

export const CYCLE_STATE_LABEL: Record<AuditCycleState, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  closed: "Closed",
};

export const CYCLE_STATE_BADGE: Record<AuditCycleState, string> = {
  draft: statusPill("zinc"),
  in_progress: statusPill("blue"),
  closed: statusPill("emerald"),
};

export const RESULT_LABEL: Record<AuditResult, string> = {
  pending: "Pending",
  verified: "Verified",
  missing: "Missing",
  damaged: "Damaged",
};

export const RESULT_BADGE: Record<AuditResult, string> = {
  pending: statusPill("zinc"),
  verified: statusPill("emerald"),
  missing: statusPill("red"),
  damaged: statusPill("amber"),
};
