import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, can } from "@/lib/rbac";
import * as audit from "@/modules/audit/audit.service";
import { CYCLE_STATE_LABEL, CYCLE_STATE_BADGE } from "@/modules/audit/audit.model";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssignAuditorsDialog } from "@/modules/audit/components/assign-auditors-dialog";
import { StartCycleForm } from "@/modules/audit/components/start-cycle-form";
import { CloseCycleDialog } from "@/modules/audit/components/close-cycle-dialog";
import { AuditChecklist } from "@/modules/audit/components/audit-checklist";
import { DiscrepancyReport } from "@/modules/audit/components/discrepancy-report";

export default async function AuditCycleDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const user = await requireUser();
  const { cycleId: cycleIdParam } = await params;
  const cycleId = Number(cycleIdParam);
  if (!Number.isInteger(cycleId)) notFound();

  const cycle = await audit.getCycle(cycleId);
  if (!cycle) notFound();

  const isAdmin = can.manageOrg(user);
  const employees = isAdmin ? await audit.listEmployeesForAuditors() : [];

  const discrepancyCount = cycle.lines.filter(
    (l) => l.result === "missing" || l.result === "damaged",
  ).length;
  const pendingCount = cycle.lines.filter((l) => l.result === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/audits"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← All cycles
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{cycle.name}</h1>
          <Badge className={CYCLE_STATE_BADGE[cycle.state]}>{CYCLE_STATE_LABEL[cycle.state]}</Badge>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {cycle.scopeDepartment?.name ?? cycle.scopeLocation ?? "Whole organisation"} ·{" "}
          {cycle.dateStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
          {cycle.dateEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      </div>

      {cycle.state === "draft" && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Auditors ({cycle.auditors.length})
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {cycle.auditors.length === 0
                    ? "None assigned yet."
                    : cycle.auditors.map((a) => a.auditor.name).join(", ")}
                </p>
              </div>
              {isAdmin && (
                <AssignAuditorsDialog
                  auditCycleId={cycle.id}
                  employees={employees}
                  assignedIds={cycle.auditors.map((a) => a.auditor.id)}
                />
              )}
            </div>
            {isAdmin && (
              <div>
                <StartCycleForm auditCycleId={cycle.id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {cycle.state === "in_progress" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {cycle.lines.length} asset{cycle.lines.length === 1 ? "" : "s"} in scope ·{" "}
              {pendingCount} pending · {discrepancyCount} discrepanc
              {discrepancyCount === 1 ? "y" : "ies"}
            </p>
            {isAdmin && (
              <CloseCycleDialog
                auditCycleId={cycle.id}
                discrepancyCount={discrepancyCount}
                pendingCount={pendingCount}
              />
            )}
          </div>
          <AuditChecklist lines={cycle.lines} auditCycleId={cycle.id} />
        </>
      )}

      {cycle.state === "closed" && (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Closed {cycle.closedDate?.toLocaleDateString()} — {discrepancyCount} discrepanc
            {discrepancyCount === 1 ? "y" : "ies"} out of {cycle.lines.length} asset
            {cycle.lines.length === 1 ? "" : "s"} audited.
          </p>
          <DiscrepancyReport
            lines={cycle.lines.filter((l) => l.result === "missing" || l.result === "damaged")}
          />
        </>
      )}
    </div>
  );
}
