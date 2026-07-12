import { AssetState } from "@prisma/client";
import { statusPill } from "@/components/ui/badge";
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
 * The status pill for every screen.
 *
 * Colour is assigned by MEANING, not by variety: green = nothing to do here,
 * blue = someone has it, amber = it's blocked on a human, red = something is
 * wrong, grey = it's out of the story. That's why `retired` and `disposed` share
 * a tone — the distinction matters to the ledger, not to someone scanning a
 * table for a problem.
 *
 *   <Badge className={BADGE[asset.state]}>{LABEL[asset.state]}</Badge>
 */
export const BADGE: Record<AssetState, string> = {
  available: statusPill("emerald"),
  allocated: statusPill("blue"),
  reserved: statusPill("violet"),
  under_maintenance: statusPill("amber"),
  lost: statusPill("red"),
  retired: statusPill("zinc"),
  disposed: statusPill("zinc"),
};
