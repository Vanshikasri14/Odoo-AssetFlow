import { requireUser } from "@/lib/rbac";
import * as maintenance from "@/modules/maintenance/maintenance.service";
import { RaiseRequestDialog } from "@/modules/maintenance/components/raise-request-dialog";
import { MaintenanceKanban } from "@/modules/maintenance/components/maintenance-kanban";

export default async function MaintenancePage() {
  const user = await requireUser();

  const [requests, assets, technicians] = await Promise.all([
    maintenance.listMaintenanceRequests(),
    maintenance.listAssetsForRequest(),
    maintenance.listTechnicians(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Maintenance</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Repairs are approval-gated — an asset only moves to Under Maintenance once an
            approver signs off.
          </p>
        </div>
        <RaiseRequestDialog assets={assets} />
      </div>

      <MaintenanceKanban requests={requests} technicians={technicians} currentUser={user} />
    </div>
  );
}
