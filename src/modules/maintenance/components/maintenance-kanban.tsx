import { Wrench } from "lucide-react";
import Link from "next/link";
import type { AssetState, MaintenanceState, MaintenancePriority, UserRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/ui/utils";
import { APPROVERS } from "@/lib/rbac";
import { LABEL as ASSET_LABEL, BADGE as ASSET_BADGE } from "@/modules/asset/lifecycle";
import { PRIORITY_LABEL, PRIORITY_BADGE } from "../maintenance.model";
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

/**
 * The approval workflow as a board.
 *
 * The columns ARE the state machine — pending → approved → assigned →
 * in_progress → resolved — so the gate is visible rather than described. You can
 * see at a glance that nothing reaches "In progress" without first passing
 * through "Approved", which is the requirement the whole screen exists to
 * enforce.
 *
 * Cards are not drag-and-drop, deliberately. Dragging a card would imply the
 * transition is a UI gesture; it isn't. It's an approval, with an approver, a
 * timestamp and an audit-log entry. The action buttons stay on the card.
 */
const COLUMNS: { state: MaintenanceState; label: string; accent: string }[] = [
  { state: "pending", label: "Pending", accent: "border-t-amber-400" },
  { state: "approved", label: "Approved", accent: "border-t-blue-400" },
  { state: "assigned", label: "Technician assigned", accent: "border-t-violet-400" },
  { state: "in_progress", label: "In progress", accent: "border-t-orange-400" },
  { state: "resolved", label: "Resolved", accent: "border-t-emerald-400" },
];

function age(d: Date) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function MaintenanceKanban({
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
        description="Raise a request above and it will appear in the Pending column."
      />
    );
  }

  const isApprover = APPROVERS.includes(currentUser.role);

  // Rejected requests don't belong on the flow board — they left it. They're
  // shown beneath, so the history isn't lost but the board stays a board.
  const rejected = requests.filter((r) => r.state === "rejected" || r.state === "cancelled");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const cards = requests.filter((r) => r.state === col.state);

          return (
            <div key={col.state} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between px-0.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {col.label}
                </h3>
                <span className="rounded-full bg-zinc-100 px-1.5 text-xs tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {cards.length}
                </span>
              </div>

              <div className="flex min-h-24 flex-1 flex-col gap-2 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900/50">
                {cards.length === 0 && (
                  <p className="py-6 text-center text-xs text-zinc-400">Empty</p>
                )}

                {cards.map((r) => {
                  const canWork = r.technicianId === currentUser.id || isApprover;

                  return (
                    <article
                      key={r.id}
                      className={cn(
                        "rounded-md border border-t-2 border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
                        col.accent,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/assets/${r.asset.id}`}
                          className="font-mono text-xs text-zinc-500 hover:underline"
                        >
                          {r.asset.assetTag}
                        </Link>
                        <Badge className={PRIORITY_BADGE[r.priority]}>
                          {PRIORITY_LABEL[r.priority]}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-50">
                        {r.asset.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                        {r.name}
                      </p>

                      {/*
                        The asset's OWN state, on the card. This is what makes the
                        approval gate visible: a card in Pending shows its asset
                        still Allocated or Available. Only once it moves to
                        Approved does the asset read Under Maintenance.
                      */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge className={ASSET_BADGE[r.asset.state]}>
                          {ASSET_LABEL[r.asset.state]}
                        </Badge>
                      </div>

                      <p className="mt-2 text-xs text-zinc-400">
                        {r.requestedBy.name} · {age(r.createDate)}
                        {r.technician && ` · ${r.technician.name}`}
                      </p>

                      {(r.state !== "resolved" || false) && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                          {r.state === "pending" && isApprover && (
                            <>
                              <ApproveForm requestId={r.id} />
                              <RejectDialog requestId={r.id} />
                            </>
                          )}
                          {r.state === "pending" && !isApprover && (
                            <span className="text-xs text-zinc-400">Awaiting approval</span>
                          )}
                          {r.state === "approved" && isApprover && (
                            <AssignTechnicianDialog requestId={r.id} technicians={technicians} />
                          )}
                          {r.state === "assigned" && canWork && <StartForm requestId={r.id} />}
                          {r.state === "in_progress" && canWork && <ResolveDialog requestId={r.id} />}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {rejected.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Rejected
          </h3>
          <div className="flex flex-wrap gap-2">
            {rejected.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm opacity-70 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="font-mono text-xs text-zinc-500">{r.asset.assetTag}</span>{" "}
                <span className="text-zinc-700 dark:text-zinc-300">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-400">
        The columns are the state machine. Nothing reaches <em>In progress</em> without passing
        through <em>Approved</em> — and the asset only flips to Under Maintenance at that gate,
        never when the request is raised.
      </p>
    </div>
  );
}
