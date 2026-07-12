import { Wrench } from "lucide-react";
import type { AssetState, MaintenanceState, MaintenancePriority, UserRole } from "@prisma/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LABEL as ASSET_LABEL, BADGE as ASSET_BADGE } from "@/modules/asset/lifecycle";
import { APPROVERS } from "@/lib/rbac";
import { STATE_LABEL, STATE_BADGE, PRIORITY_LABEL, PRIORITY_BADGE } from "../maintenance.model";
import { ApproveForm } from "./approve-form";
import { RejectDialog } from "./reject-dialog";
import { AssignTechnicianDialog } from "./assign-technician-dialog";
import { StartForm } from "./start-form";
import { ResolveDialog } from "./resolve-dialog";

type Row = {
  id: number;
  name: string;
  priority: MaintenancePriority;
  state: MaintenanceState;
  technicianId: number | null;
  createDate: Date;
  asset: { id: number; name: string; assetTag: string; state: AssetState };
  requestedBy: { id: number; name: string };
  technician: { id: number; name: string } | null;
};

type Technician = { id: number; name: string };

export function MaintenanceRequestsTable({
  requests,
  technicians,
  currentUser,
}: {
  requests: Row[];
  technicians: Technician[];
  currentUser: { id: number; role: UserRole };
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No maintenance requests yet"
        description="Raise a request above to see it here."
      />
    );
  }

  const isApprover = APPROVERS.includes(currentUser.role);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Issue</TableHead>
          <TableHead>Requested by</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Request status</TableHead>
          <TableHead>Asset status</TableHead>
          <TableHead>Technician</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => {
          const canWork = r.technicianId === currentUser.id || isApprover;
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                {r.asset.name} <span className="text-zinc-400">({r.asset.assetTag})</span>
              </TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.requestedBy.name}</TableCell>
              <TableCell>
                <Badge className={PRIORITY_BADGE[r.priority]}>{PRIORITY_LABEL[r.priority]}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={STATE_BADGE[r.state]}>{STATE_LABEL[r.state]}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={ASSET_BADGE[r.asset.state]}>{ASSET_LABEL[r.asset.state]}</Badge>
              </TableCell>
              <TableCell>{r.technician?.name ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {r.state === "pending" && isApprover && (
                    <>
                      <ApproveForm requestId={r.id} />
                      <RejectDialog requestId={r.id} />
                    </>
                  )}
                  {r.state === "approved" && isApprover && (
                    <AssignTechnicianDialog requestId={r.id} technicians={technicians} />
                  )}
                  {r.state === "assigned" && canWork && <StartForm requestId={r.id} />}
                  {r.state === "in_progress" && canWork && <ResolveDialog requestId={r.id} />}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
