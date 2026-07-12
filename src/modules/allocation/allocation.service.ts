import "server-only";
import { Prisma, type AssetCondition } from "@prisma/client";
import { db } from "@/lib/db";
import { APPROVERS } from "@/lib/rbac";
import {
  AssetAlreadyAllocatedError,
  DomainError,
  ForbiddenError,
} from "@/modules/core/errors";
import { approverIds, logMessage, notify, MODEL } from "@/modules/core/chatter.service";
import { transitionAsset } from "@/modules/asset/lifecycle";
import { nextByCode, SEQ } from "@/modules/core/sequence.service";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  CUSTODY — the conflict rule
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The brief, verbatim: "You can't allocate an asset that's already taken.
 * Priya has Laptop AF-0114. If Raj tries to allocate it too, the system blocks
 * it, shows him 'currently held by Priya,' and offers a Transfer Request button
 * instead."
 *
 * Three requirements hide in that sentence, and blocking is only the first:
 *   1. REFUSE the allocation.
 *   2. NAME the current holder.
 *   3. OFFER the way forward — a transfer request.
 *
 * An allocation row is OPEN while `returned_date IS NULL`. Postgres enforces at
 * most one open row per asset via the partial unique index
 * `asset_allocation_one_active_per_asset`. The lookup below exists to produce a
 * HELPFUL refusal; the index exists to make the rule UNBREAKABLE. Two people
 * clicking Allocate at the same instant cannot both win — the second INSERT is
 * rejected by the database, and the catch block below turns that into the same
 * friendly message.
 */

/** Prisma surfaces a partial-unique-index violation as P2002. */
function isDuplicateAllocation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/** The open allocation for an asset, if any — i.e. who holds it right now. */
export async function currentHolder(assetId: number) {
  return db.assetAllocation.findFirst({
    where: { assetId, returnedDate: null },
    include: {
      holderUser: { select: { id: true, name: true } },
      holderDept: { select: { id: true, name: true } },
      asset: { select: { id: true, assetTag: true, name: true } },
    },
  });
}

type AllocateInput = {
  assetId: number;
  holderUserId: number | null;
  holderDeptId: number | null;
  expectedReturnDate: Date | null;
  notes: string | null;
};

/**
 * Issue an asset to a person or a department.
 *
 * Everything happens in ONE transaction: the custody row, the asset's state
 * change, the log line, and the notification. If any part fails, none of it
 * happened — you never get an asset marked `allocated` with no custody row
 * explaining who has it.
 */
export async function allocateAsset(actorId: number, input: AllocateInput) {
  const asset = await db.assetAsset.findUnique({
    where: { id: input.assetId },
    select: { id: true, assetTag: true, name: true, state: true, isBookable: true },
  });
  if (!asset) throw new DomainError("That asset no longer exists.", "ASSET_NOT_FOUND");

  // ── Requirement 1 + 2: refuse, and name the holder ────────────────────────
  const open = await currentHolder(input.assetId);
  if (open) {
    const holderName = open.holderUser?.name ?? open.holderDept?.name ?? "someone else";
    throw new AssetAlreadyAllocatedError(
      asset.assetTag,
      holderName,
      open.holderUser?.id ?? null,
    );
  }

  // An asset in the workshop, written off, or already disposed of cannot be
  // issued. transitionAsset would refuse anyway, but saying so plainly is kinder
  // than "illegal transition under_maintenance → allocated".
  if (asset.state !== "available" && asset.state !== "reserved") {
    throw new DomainError(
      `${asset.assetTag} is ${asset.state.replace(/_/g, " ")} and cannot be allocated.`,
      "ASSET_NOT_AVAILABLE",
    );
  }

  try {
    return await db.$transaction(async (tx) => {
      const allocation = await tx.assetAllocation.create({
        data: {
          assetId: input.assetId,
          holderUserId: input.holderUserId,
          holderDeptId: input.holderDeptId,
          expectedReturnDate: input.expectedReturnDate,
          notes: input.notes,
          allocatedById: actorId,
          state: "active",
          createUid: actorId,
          writeUid: actorId,
        },
        include: {
          holderUser: { select: { id: true, name: true } },
          holderDept: { select: { id: true, name: true } },
        },
      });

      const holderName = allocation.holderUser?.name ?? allocation.holderDept?.name ?? "—";

      await transitionAsset(tx, {
        assetId: input.assetId,
        to: "allocated",
        actorId,
        action: "allocate",
        body: `${asset.assetTag} allocated to ${holderName}.`,
      });

      if (allocation.holderUserId) {
        await notify(tx, {
          userId: allocation.holderUserId,
          type: "asset_assigned",
          title: "An asset was assigned to you",
          body: `${asset.assetTag} — ${asset.name}${
            input.expectedReturnDate
              ? `. Due back ${input.expectedReturnDate.toLocaleDateString()}.`
              : "."
          }`,
          actionUrl: `/assets/${asset.id}`,
        });
      }

      return allocation;
    });
  } catch (e) {
    // The race backstop. Someone allocated it between our check and our INSERT;
    // the partial unique index caught what the check could not. Re-read the
    // holder and produce the same friendly refusal.
    if (isDuplicateAllocation(e)) {
      const open2 = await currentHolder(input.assetId);
      throw new AssetAlreadyAllocatedError(
        asset.assetTag,
        open2?.holderUser?.name ?? open2?.holderDept?.name ?? "someone else",
        open2?.holderUser?.id ?? null,
      );
    }
    throw e;
  }
}

/**
 * Take an asset back. Closes the custody row (which frees the partial unique
 * index for the next holder), records the condition it came back in, and returns
 * the asset to `available`.
 */
export async function returnAsset(
  actor: { id: number; role: string },
  allocationId: number,
  checkin: { checkinCondition: AssetCondition; checkinNotes: string | null },
) {
  const allocation = await db.assetAllocation.findUnique({
    where: { id: allocationId },
    include: {
      asset: { select: { id: true, assetTag: true, name: true } },
      holderUser: { select: { id: true, name: true } },
      holderDept: { select: { id: true, name: true } },
    },
  });

  if (!allocation) throw new DomainError("That allocation no longer exists.", "NOT_FOUND");
  if (allocation.returnedDate) {
    throw new DomainError(
      `${allocation.asset.assetTag} has already been returned.`,
      "ALREADY_RETURNED",
    );
  }

  // The holder may return their own asset; anyone else needs approver rights.
  const isHolder = allocation.holderUserId === actor.id;
  if (!isHolder && !APPROVERS.includes(actor.role as never)) {
    throw new ForbiddenError("Only the holder or an Asset Manager can process this return.");
  }

  return db.$transaction(async (tx) => {
    await tx.assetAllocation.update({
      where: { id: allocationId },
      data: {
        returnedDate: new Date(),
        state: "returned",
        checkinCondition: checkin.checkinCondition,
        checkinNotes: checkin.checkinNotes,
        writeUid: actor.id,
      },
    });

    const holderName = allocation.holderUser?.name ?? allocation.holderDept?.name ?? "—";

    await transitionAsset(tx, {
      assetId: allocation.assetId,
      to: "available",
      actorId: actor.id,
      action: "return",
      body: `${allocation.asset.assetTag} returned by ${holderName} — condition: ${checkin.checkinCondition}.`,
      // The condition observed at check-in becomes the asset's condition. A
      // laptop that comes back cracked is a cracked laptop.
      patch: { condition: checkin.checkinCondition },
    });

    return allocation;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  TRANSFER  —  Requested → Approved → Re-allocated
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raise a transfer request. This is the door the conflict rule points at: Raj
 * can't take Priya's laptop, but he can ask for it.
 */
export async function requestTransfer(
  actorId: number,
  input: { assetId: number; toUserId: number; reason: string },
) {
  const open = await currentHolder(input.assetId);
  if (!open) {
    throw new DomainError(
      "Nobody currently holds that asset — allocate it directly instead.",
      "NOT_ALLOCATED",
    );
  }
  if (open.holderUserId === input.toUserId) {
    throw new DomainError("They already hold this asset.", "ALREADY_HOLDER");
  }

  const existing = await db.assetTransferRequest.findFirst({
    where: { assetId: input.assetId, state: "pending" },
    select: { id: true },
  });
  if (existing) {
    throw new DomainError(
      "A transfer request for this asset is already awaiting approval.",
      "TRANSFER_PENDING",
    );
  }

  return db.$transaction(async (tx) => {
    const ref = await nextByCode(tx, SEQ.TRANSFER);

    const transfer = await tx.assetTransferRequest.create({
      data: {
        assetId: input.assetId,
        fromUserId: open.holderUserId,
        toUserId: input.toUserId,
        requestedById: actorId,
        reason: input.reason,
        state: "pending",
        allocationId: open.id,
        createUid: actorId,
        writeUid: actorId,
      },
      include: {
        toUser: { select: { id: true, name: true, departmentId: true } },
        fromUser: { select: { id: true, name: true } },
      },
    });

    const fromName = open.holderUser?.name ?? open.holderDept?.name ?? "—";

    await logMessage(tx, {
      model: MODEL.ASSET,
      resId: input.assetId,
      action: "request_transfer",
      body: `${ref}: transfer of ${open.asset.assetTag} requested — ${fromName} → ${transfer.toUser.name}.`,
      authorId: actorId,
    });

    // Whoever can approve needs to know: Asset Managers, Admins, and the head of
    // the recipient's department.
    const recipients = await approverIds(tx, transfer.toUser.departmentId);
    await Promise.all(
      recipients.map((userId) =>
        notify(tx, {
          userId,
          type: "transfer_requested",
          title: "Transfer request awaiting approval",
          body: `${open.asset.assetTag} — ${fromName} → ${transfer.toUser.name}.`,
          actionUrl: "/allocations?tab=transfers",
        }),
      ),
    );

    // Courtesy: the person losing the asset should hear it from the system, not
    // from someone turning up at their desk.
    if (open.holderUserId && open.holderUserId !== actorId) {
      await notify(tx, {
        userId: open.holderUserId,
        type: "transfer_requested",
        title: "Someone has requested an asset you hold",
        body: `${transfer.toUser.name} has requested ${open.asset.assetTag}.`,
        actionUrl: `/assets/${input.assetId}`,
      });
    }

    return transfer;
  });
}

/**
 * Approve a transfer: close the old custody row, open a new one, notify both
 * parties. All in one transaction — a half-applied transfer would leave the
 * asset held by nobody, or by two people.
 *
 * Note the ORDER matters. The old allocation must be closed BEFORE the new one
 * is created, or the partial unique index (correctly) rejects the second open
 * row for the same asset. The constraint enforces our own invariant against us,
 * which is exactly what it's for.
 */
export async function approveTransfer(actorId: number, transferId: number) {
  const transfer = await db.assetTransferRequest.findUnique({
    where: { id: transferId },
    include: {
      asset: { select: { id: true, assetTag: true, name: true } },
      toUser: { select: { id: true, name: true } },
      fromUser: { select: { id: true, name: true } },
    },
  });

  if (!transfer) throw new DomainError("That request no longer exists.", "NOT_FOUND");
  if (transfer.state !== "pending") {
    throw new DomainError(`This request has already been ${transfer.state}.`, "NOT_PENDING");
  }

  return db.$transaction(async (tx) => {
    // 1. Close the outgoing custody.
    await tx.assetAllocation.updateMany({
      where: { assetId: transfer.assetId, returnedDate: null },
      data: { returnedDate: new Date(), state: "returned", writeUid: actorId },
    });

    // 2. Open the incoming custody.
    const allocation = await tx.assetAllocation.create({
      data: {
        assetId: transfer.assetId,
        holderUserId: transfer.toUserId,
        allocatedById: actorId,
        state: "active",
        notes: `Transferred from ${transfer.fromUser?.name ?? "previous holder"}.`,
        createUid: actorId,
        writeUid: actorId,
      },
    });

    // 3. Mark the request approved.
    await tx.assetTransferRequest.update({
      where: { id: transferId },
      data: {
        state: "approved",
        approverId: actorId,
        approvedDate: new Date(),
        allocationId: allocation.id,
        writeUid: actorId,
      },
    });

    // The asset was `allocated` and remains `allocated` — only the holder
    // changed. transitionAsset treats same-state as a no-op, so we log directly.
    await logMessage(tx, {
      model: MODEL.ASSET,
      resId: transfer.assetId,
      action: "approve_transfer",
      body: `${transfer.asset.assetTag} transferred: ${transfer.fromUser?.name ?? "—"} → ${transfer.toUser.name}.`,
      authorId: actorId,
      payload: { from: transfer.fromUserId, to: transfer.toUserId },
    });

    await notify(tx, {
      userId: transfer.toUserId,
      type: "transfer_approved",
      title: "Transfer approved",
      body: `${transfer.asset.assetTag} — ${transfer.asset.name} is now yours.`,
      actionUrl: `/assets/${transfer.assetId}`,
    });

    if (transfer.fromUserId) {
      await notify(tx, {
        userId: transfer.fromUserId,
        type: "transfer_approved",
        title: "An asset has been transferred away",
        body: `${transfer.asset.assetTag} now belongs to ${transfer.toUser.name}.`,
        actionUrl: `/assets/${transfer.assetId}`,
      });
    }

    return allocation;
  });
}

export async function rejectTransfer(actorId: number, transferId: number, reason: string | null) {
  const transfer = await db.assetTransferRequest.findUnique({
    where: { id: transferId },
    include: { asset: { select: { assetTag: true } } },
  });

  if (!transfer) throw new DomainError("That request no longer exists.", "NOT_FOUND");
  if (transfer.state !== "pending") {
    throw new DomainError(`This request has already been ${transfer.state}.`, "NOT_PENDING");
  }

  return db.$transaction(async (tx) => {
    await tx.assetTransferRequest.update({
      where: { id: transferId },
      data: { state: "rejected", approverId: actorId, rejectReason: reason, writeUid: actorId },
    });

    await logMessage(tx, {
      model: MODEL.ASSET,
      resId: transfer.assetId,
      action: "reject_transfer",
      body: `Transfer of ${transfer.asset.assetTag} rejected.${reason ? ` Reason: ${reason}` : ""}`,
      authorId: actorId,
    });

    await notify(tx, {
      userId: transfer.requestedById,
      type: "transfer_rejected",
      title: "Transfer request rejected",
      body: `${transfer.asset.assetTag}${reason ? ` — ${reason}` : ""}`,
      actionUrl: "/allocations?tab=transfers",
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  QUERIES
// ─────────────────────────────────────────────────────────────────────────────

const ALLOCATION_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true, state: true } },
  holderUser: { select: { id: true, name: true } },
  holderDept: { select: { id: true, name: true } },
  allocatedBy: { select: { id: true, name: true } },
} as const;

/**
 * OVERDUE IS DERIVED, NOT STORED: `expectedReturnDate < now AND returnedDate IS
 * NULL`. A stored `is_overdue` flag would need a cron to maintain, and would be
 * silently wrong every time that cron didn't run. The dashboard uses this same
 * predicate, so the two can never disagree.
 */
export function overdueWhere() {
  return { returnedDate: null, expectedReturnDate: { lt: new Date() } };
}

export async function listAllocations(scope: "active" | "overdue" | "returned") {
  const where =
    scope === "overdue"
      ? overdueWhere()
      : scope === "returned"
        ? { returnedDate: { not: null } }
        : { returnedDate: null };

  return db.assetAllocation.findMany({
    where,
    orderBy: scope === "returned" ? { returnedDate: "desc" } : { allocatedDate: "desc" },
    include: ALLOCATION_INCLUDE,
    take: 200,
  });
}

/** Just mine — what the Employee sees on their own dashboard. */
export async function listMyAllocations(userId: number) {
  return db.assetAllocation.findMany({
    where: { holderUserId: userId, returnedDate: null },
    orderBy: { allocatedDate: "desc" },
    include: ALLOCATION_INCLUDE,
  });
}

export async function listTransfers() {
  return db.assetTransferRequest.findMany({
    orderBy: [{ state: "asc" }, { createDate: "desc" }],
    include: {
      asset: { select: { id: true, assetTag: true, name: true } },
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true } },
    },
    take: 100,
  });
}

/** Assets that can be issued right now, for the allocation form's picker. */
export async function listAllocatableAssets() {
  return db.assetAsset.findMany({
    where: { active: true, state: { in: ["available", "reserved"] } },
    orderBy: { assetTag: "asc" },
    select: { id: true, assetTag: true, name: true, state: true },
  });
}

/**
 * Every asset, as a bare {id, tag, name} — for the "include assets that are
 * already held" toggle on the allocate form, which is how you trigger the
 * conflict path on purpose.
 *
 * This used to call searchAssets(), which drags in each asset's category,
 * department and open allocations. Three joins across thirty rows, to populate a
 * <select> that renders two strings. On a database ~80ms away that was most of a
 * second, on a page that doesn't need any of it.
 */
export async function listAllAssetsBrief() {
  return db.assetAsset.findMany({
    where: { active: true },
    orderBy: { assetTag: "asc" },
    select: { id: true, assetTag: true, name: true },
  });
}

export async function listHolders() {
  const [users, departments] = await Promise.all([
    db.resUsers.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, department: { select: { name: true } } },
    }),
    db.hrDepartment.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { users, departments };
}
