import "server-only";
import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { APPROVERS } from "@/lib/rbac";
import { DomainError, ForbiddenError } from "@/modules/core/errors";
import { logMessage, notify, notifyMany, approverIds, MODEL } from "@/modules/core/chatter.service";
import { transitionAsset } from "@/modules/asset/lifecycle";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  MAINTENANCE — the approval gate
 * ══════════════════════════════════════════════════════════════════════════
 * pending → approved|rejected → assigned → in_progress → resolved
 *
 * The asset flips to `under_maintenance` on APPROVAL, never on request — that
 * gate is the entire point of this screen. `raiseMaintenanceRequest()` never
 * touches asset state; only `approveMaintenance()` does, via `transitionAsset`.
 * `resolveMaintenance()` requires `in_progress`, which is only reachable via
 * approved → assigned → in_progress, so a never-approved request can't be
 * resolved either.
 */

function assertCanWork(
  request: { technicianId: number | null },
  actor: { id: number; role: UserRole },
): void {
  if (request.technicianId !== actor.id && !APPROVERS.includes(actor.role)) {
    throw new ForbiddenError("Only the assigned technician or an approver can do that.");
  }
}

export async function listAssetsForRequest() {
  return db.assetAsset.findMany({
    where: { active: true, state: { in: ["available", "allocated", "reserved"] } },
    orderBy: { assetTag: "asc" },
    select: { id: true, name: true, assetTag: true },
  });
}

export async function listTechnicians() {
  return db.resUsers.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listMaintenanceRequests() {
  return db.maintenanceRequest.findMany({
    orderBy: { createDate: "desc" },
    include: {
      asset: { select: { id: true, name: true, assetTag: true, state: true } },
      requestedBy: { select: { id: true, name: true } },
      technician: { select: { id: true, name: true } },
    },
  });
}

type RaiseInput = {
  assetId: number;
  requestedById: number;
  name: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  imageUrl?: string | null;
};

/** Raise a request. Deliberately does NOT touch asset.state — an allocated
 *  laptop stays Allocated the instant this is submitted. */
export async function raiseMaintenanceRequest(input: RaiseInput) {
  return db.$transaction(async (tx) => {
    const asset = await tx.assetAsset.findUnique({
      where: { id: input.assetId },
      select: { id: true, assetTag: true, departmentId: true },
    });
    if (!asset) throw new DomainError("Asset not found.", "ASSET_NOT_FOUND");

    const request = await tx.maintenanceRequest.create({
      data: {
        name: input.name,
        assetId: input.assetId,
        requestedById: input.requestedById,
        description: input.description,
        priority: input.priority,
        imageUrl: input.imageUrl || null,
        createUid: input.requestedById,
        writeUid: input.requestedById,
      },
    });

    await logMessage(tx, {
      model: MODEL.MAINTENANCE,
      resId: request.id,
      action: "create",
      body: `Maintenance requested for ${asset.assetTag}: ${input.name}.`,
      authorId: input.requestedById,
    });

    const approvers = await approverIds(tx, asset.departmentId);
    await notifyMany(tx, approvers, {
      type: "maintenance_requested",
      title: "Maintenance requested",
      body: `${asset.assetTag} — ${input.name} (${input.priority}).`,
      actionUrl: "/maintenance",
    });

    return request;
  });
}

export async function approveMaintenance(requestId: number, actorId: number) {
  return db.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { asset: { select: { id: true, assetTag: true } } },
    });
    if (!request) throw new DomainError("Request not found.", "REQUEST_NOT_FOUND");
    if (request.state !== "pending") {
      throw new DomainError("Only a pending request can be approved.", "NOT_PENDING");
    }

    await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { state: "approved", approverId: actorId, approvedDate: new Date(), writeUid: actorId },
    });

    // ← THE gate: the asset only moves on approval, never on request.
    await transitionAsset(tx, {
      assetId: request.assetId,
      to: "under_maintenance",
      actorId,
      action: "approve_maintenance",
      body: `Maintenance approved — ${request.asset.assetTag} sent for repair.`,
    });

    await notify(tx, {
      userId: request.requestedById,
      type: "maintenance_approved",
      title: "Maintenance approved",
      body: `${request.asset.assetTag} is now under maintenance.`,
      actionUrl: "/maintenance",
    });

    return request;
  });
}

export async function rejectMaintenance(requestId: number, actorId: number, reason: string) {
  return db.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { asset: { select: { assetTag: true } } },
    });
    if (!request) throw new DomainError("Request not found.", "REQUEST_NOT_FOUND");
    if (request.state !== "pending") {
      throw new DomainError("Only a pending request can be rejected.", "NOT_PENDING");
    }

    await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { state: "rejected", approverId: actorId, rejectReason: reason, writeUid: actorId },
    });

    await logMessage(tx, {
      model: MODEL.MAINTENANCE,
      resId: requestId,
      action: "reject",
      body: `Maintenance request for ${request.asset.assetTag} rejected: ${reason}`,
      authorId: actorId,
    });

    await notify(tx, {
      userId: request.requestedById,
      type: "maintenance_rejected",
      title: "Maintenance request rejected",
      body: reason,
      actionUrl: "/maintenance",
    });

    return request;
  });
}

export async function assignTechnician(requestId: number, actorId: number, technicianId: number) {
  return db.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { asset: { select: { assetTag: true } } },
    });
    if (!request) throw new DomainError("Request not found.", "REQUEST_NOT_FOUND");
    if (request.state !== "approved") {
      throw new DomainError("Only an approved request can get a technician assigned.", "NOT_APPROVED");
    }

    const technician = await tx.resUsers.findUnique({
      where: { id: technicianId },
      select: { id: true, name: true, active: true },
    });
    if (!technician || !technician.active) {
      throw new DomainError("That technician is not available.", "TECHNICIAN_NOT_FOUND");
    }

    await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { state: "assigned", technicianId, writeUid: actorId },
    });

    await logMessage(tx, {
      model: MODEL.MAINTENANCE,
      resId: requestId,
      action: "assign_technician",
      body: `${technician.name} assigned to repair ${request.asset.assetTag}.`,
      authorId: actorId,
    });

    return request;
  });
}

export async function startMaintenance(requestId: number, actor: { id: number; role: UserRole }) {
  return db.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { asset: { select: { assetTag: true } } },
    });
    if (!request) throw new DomainError("Request not found.", "REQUEST_NOT_FOUND");
    assertCanWork(request, actor);
    if (request.state !== "assigned") {
      throw new DomainError("Work can only start once a technician is assigned.", "NOT_ASSIGNED");
    }

    await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { state: "in_progress", startedDate: new Date(), writeUid: actor.id },
    });

    await logMessage(tx, {
      model: MODEL.MAINTENANCE,
      resId: requestId,
      action: "start",
      body: `Work started on ${request.asset.assetTag}.`,
      authorId: actor.id,
    });

    return request;
  });
}

type ResolveInput = { resolutionNotes: string; repairCost: number | null };

export async function resolveMaintenance(
  requestId: number,
  input: ResolveInput,
  actor: { id: number; role: UserRole },
) {
  return db.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { asset: { select: { id: true, assetTag: true } } },
    });
    if (!request) throw new DomainError("Request not found.", "REQUEST_NOT_FOUND");
    assertCanWork(request, actor);
    // "You cannot resolve a request that was never approved" — in_progress is
    // only reachable via approved → assigned → in_progress.
    if (request.state !== "in_progress") {
      throw new DomainError("Only work that is in progress can be resolved.", "NOT_IN_PROGRESS");
    }

    await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        state: "resolved",
        resolvedDate: new Date(),
        resolutionNotes: input.resolutionNotes,
        repairCost: input.repairCost,
        writeUid: actor.id,
      },
    });

    await transitionAsset(tx, {
      assetId: request.assetId,
      to: "available",
      actorId: actor.id,
      action: "resolve_maintenance",
      body: `${request.asset.assetTag} repaired — back in service.`,
    });

    await notify(tx, {
      userId: request.requestedById,
      type: "maintenance_resolved",
      title: "Maintenance resolved",
      body: `${request.asset.assetTag} is repaired and available again.`,
      actionUrl: "/maintenance",
    });

    return request;
  });
}
