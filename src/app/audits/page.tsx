import { requireUser, can } from "@/lib/rbac";
import { listDepartments } from "@/modules/hr/hr.service";
import * as audit from "@/modules/audit/audit.service";
import { CreateCycleDialog } from "@/modules/audit/components/create-cycle-dialog";
import { CyclesTable } from "@/modules/audit/components/cycles-table";

export default async function AuditsPage() {
  const user = await requireUser();

  const [cycles, departments] = await Promise.all([audit.listCycles(), listDepartments()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Asset Audit</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Scoped audit cycles with an automatic discrepancy report on close.
          </p>
        </div>
        {can.manageOrg(user) && <CreateCycleDialog departments={departments} />}
      </div>

      <CyclesTable cycles={cycles} />
    </div>
  );
}
