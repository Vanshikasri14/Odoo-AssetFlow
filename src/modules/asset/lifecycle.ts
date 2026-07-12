import { AssetState } from "@prisma/client";
import type { Tx } from "@/lib/db";
import { IllegalTransitionError } from "@/modules/core/errors";
import { logMessage, MODEL } from "@/modules/core/chatter.service";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  THE ASSET LIFECYCLE STATE MACHINE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This is the spine of AssetFlow. Allocation, transfer, return, maintenance
 * approval, maintenance resolution and audit closure are all — underneath —
 * the same operation: a guarded transition on this machine, plus a log line.
 *
 * INVARIANT: `asset_asset.state` is written NOWHERE ELSE in this codebase.
 * Every mutation goes through `transitionAsset()`. That single rule is what
 * keeps six different workflows from inventing six inconsistent notions of
 * what "Available" means.
 *
 *                    ┌──────────────────────────────┐
 *                    │                              ▼
 *   ┌────────────┐  allocate   ┌───────────┐  return   ┌───────────┐
 *   │  RESERVED  │◄────────────│ AVAILABLE │──────────►│ ALLOCATED │
 *   └────────────┘   reserve   └───────────┘  allocate └───────────┘
 *                                    ▲  │                    │
 *                        resolve     │  │ approve maintenance│
 *                                    │  ▼                    │
 *                          ┌─────────────────────┐◄──────────┘
 *                          │  UNDER_MAINTENANCE  │
 *                          └─────────────────────┘
 *                                    │
 *              ┌─────────────────────┼─────────────────────┐
 *              ▼                     ▼                     ▼
 *          ┌───────┐            ┌─────────┐          ┌──────────┐
 *          │ LOST  │            │ RETIRED │─────────►│ DISPOSED │  (terminal)
 *          └───────┘            └─────────┘          └──────────┘
 *           (audit)
 */
export const ASSET_TRANSITIONS: Record<AssetState, readonly AssetState[]> = {
  // Free stock: can be handed out, held for someone, sent for repair, written off.
  available: ["allocated", "reserved", "under_maintenance", "lost", "retired"],

  // In someone's hands: they return it, it breaks, or it goes missing.
  allocated: ["available", "under_maintenance", "lost"],

  // Held pending a booking/transfer: released, converted, or sent for repair.
  reserved: ["available", "allocated", "under_maintenance"],

  // In the workshop: fixed, or written off as beyond economic repair.
  under_maintenance: ["available", "retired", "disposed", "lost"],

  // Missing per an audit. Recoverable — assets do turn up again.
  lost: ["available", "retired", "disposed"],

  // End of service life, but still physically present.
  retired: ["disposed", "available"],

  // Terminal. A disposed asset has left the organisation for good.
  disposed: [],
} as const;

export function canTransition(from: AssetState, to: AssetState): boolean {
  return ASSET_TRANSITIONS[from].includes(to);
}

/** Valid next states, for rendering only the buttons a user can actually press. */
export function nextStates(from: AssetState): readonly AssetState[] {
  return ASSET_TRANSITIONS[from];
}

type TransitionArgs = {
  assetId: number;
  to: AssetState;
  /** Who did it — stamped onto the log entry. Null for system/cron actions. */
  actorId: number | null;
  /** The verb for the audit trail: 'allocate', 'return', 'approve_maintenance'… */
  action: string;
  /** The human-readable log line. If omitted, a sensible default is generated. */
  body?: string;
  /** Other columns to write in the same UPDATE (condition, location, …). */
  patch?: { condition?: "new" | "good" | "fair" | "poor" | "damaged"; location?: string };
};

/**
 * Guarded transition + audit log, atomically.
 *
 * MUST be called with a transaction client (`db.$transaction(tx => …)`) so that
 * the state change, the log entry and whatever the caller is doing alongside it
 * either all land or all roll back.
 */
export async function transitionAsset(tx: Tx, args: TransitionArgs) {
  const asset = await tx.assetAsset.findUnique({
    where: { id: args.assetId },
    select: { id: true, state: true, name: true, assetTag: true },
  });

  if (!asset) throw new Error(`Asset ${args.assetId} not found.`);

  // No-op transitions are allowed through silently: re-approving an already
  // approved request shouldn't explode, it should just do nothing.
  if (asset.state === args.to) return asset;

  if (!canTransition(asset.state, args.to)) {
    throw new IllegalTransitionError(asset.state, args.to);
  }

  const updated = await tx.assetAsset.update({
    where: { id: args.assetId },
    data: {
      state: args.to,
      ...(args.patch ?? {}),
      writeUid: args.actorId,
    },
    select: { id: true, state: true, name: true, assetTag: true },
  });

  await logMessage(tx, {
    model: MODEL.ASSET,
    resId: asset.id,
    action: args.action,
    body:
      args.body ??
      `${asset.assetTag} moved from ${LABEL[asset.state]} to ${LABEL[args.to]}.`,
    authorId: args.actorId,
    payload: { from: asset.state, to: args.to },
  });

  return updated;
}

/** Display labels. Kept beside the machine so a new state can't be added
 *  without someone noticing it needs a label and a colour. */
export const LABEL: Record<AssetState, string> = {
  available: "Available",
  allocated: "Allocated",
  reserved: "Reserved",
  under_maintenance: "Under Maintenance",
  lost: "Lost",
  retired: "Retired",
  disposed: "Disposed",
};

/**
 * Tailwind classes for the status pill. Pass to the design system's <Badge> as
 * `className`, so that "Under Maintenance" is the same amber on the dashboard,
 * the registry, the maintenance queue and the audit checklist — forever, without
 * anyone having to coordinate.
 *
 *   <Badge className={BADGE[asset.state]}>{LABEL[asset.state]}</Badge>
 */
export const BADGE: Record<AssetState, string> = {
  available:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  allocated:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-500/30",
  reserved:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  under_maintenance:
    "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  lost: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
  retired:
    "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20",
  disposed:
    "bg-zinc-100 text-zinc-500 ring-zinc-400/20 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-zinc-600/20",
};
