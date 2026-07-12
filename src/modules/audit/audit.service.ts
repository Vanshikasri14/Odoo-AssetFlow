import "server-only";
import { db } from "@/lib/db";
import { DomainError, IllegalTransitionError } from "@/modules/core/errors";
import { logMessage, notifyMany, approverIds, MODEL } from "@/modules/core/chatter.service";
import { transitionAsset } from "@/modules/asset/lifecycle";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  AUDIT CYCLES — a scoped, dated campaign, not a single form
 * ══════════════════════════════════════════════════════════════════════════
 * draft → in_progress (materialises one audit_line per in-scope asset,
 * snapshotting the scope so it stays reproducible even after assets move) →
 * closed (locks the cycle; every `missing` line sends the asset to `lost`,
 * every `damaged` line patches its condition — both fire `audit_discrepancy`).
 */

export async function listCycles() {
  return db.auditCycle.findMany({
    orderBy: { createDate: "desc" },
    include: {
      scopeDepartment: { select: { id: true, name: true } },
      _count: { select: { lines: true, auditors: true } },
    },
  });
}

export async function getCycle(id: number) {
  return db.auditCycle.findUnique({
    where: { id },
    include: {
      scopeDepartment: { select: { id: true, name: true } },
      auditors: { include: { auditor: { select: { id: true, name: true } } } },
      lines: {
        orderBy: { id: "asc" },
        include: {
          asset: {
            select: { id: true, name: true, assetTag: true, location: true, condition: true },
          },
          auditor: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function listEmployeesForAuditors() {
  return db.resUsers.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

type CreateCycleInput = {
  name: string;
  scopeDepartmentId: number | null;
  scopeLocation?: string | null;
  dateStart: Date;
  dateEnd: Date;
};

export async function createCycle(actorId: number, input: CreateCycleInput) {
  return db.$transaction(async (tx) => {
    const cycle = await tx.auditCycle.create({
      data: {
        name: input.name,
        scopeDepartmentId: input.scopeDepartmentId,
        scopeLocation: input.scopeLocation || null,
        dateStart: input.dateStart,
        dateEnd: input.dateEnd,
        createUid: actorId,
        writeUid: actorId,
      },
    });

    await logMessage(tx, {
      model: MODEL.AUDIT_CYCLE,
      resId: cycle.id,
      action: "create",
      body: `Audit cycle "${cycle.name}" created.`,
      authorId: actorId,
    });

    return cycle;
  });
}

/** Full sync — the cycle's auditor list becomes exactly `userIds`. Only
 *  newly-added auditors are notified; re-submitting the same set is a no-op. */
export async function assignAuditors(actorId: number, auditCycleId: number, userIds: number[]) {
  return db.$transaction(async (tx) => {
    const cycle = await tx.auditCycle.findUnique({
      where: { id: auditCycleId },
      select: { id: true, name: true, state: true },
    });
    if (!cycle) throw new DomainError("Audit cycle not found.", "CYCLE_NOT_FOUND");
    if (cycle.state !== "draft") {
      throw new DomainError(
        "Auditors can only be changed while the cycle is still a draft.",
        "NOT_DRAFT",
      );
    }

    const existing = await tx.auditCycleAuditor.findMany({
      where: { auditCycleId },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((e) => e.userId));
    const newIds = userIds.filter((id) => !existingIds.has(id));
    const removedIds = [...existingIds].filter((id) => !userIds.includes(id));

    if (removedIds.length > 0) {
      await tx.auditCycleAuditor.deleteMany({
        where: { auditCycleId, userId: { in: removedIds } },
      });
    }
    if (newIds.length > 0) {
      await tx.auditCycleAuditor.createMany({
        data: newIds.map((userId) => ({ auditCycleId, userId })),
        skipDuplicates: true,
      });
    }

    await logMessage(tx, {
      model: MODEL.AUDIT_CYCLE,
      resId: auditCycleId,
      action: "assign_auditors",
      body: `${userIds.length} auditor${userIds.length === 1 ? "" : "s"} assigned to "${cycle.name}".`,
      authorId: actorId,
    });

    if (newIds.length > 0) {
      await notifyMany(tx, newIds, {
        type: "audit_assigned",
        title: "Assigned to an audit",
        body: `You've been assigned to audit cycle "${cycle.name}".`,
        actionUrl: `/audits/${auditCycleId}`,
      });
    }

    return cycle;
  });
}

export async function startCycle(actorId: number, auditCycleId: number) {
  return db.$transaction(async (tx) => {
    const cycle = await tx.auditCycle.findUnique({ where: { id: auditCycleId } });
    if (!cycle) throw new DomainError("Audit cycle not found.", "CYCLE_NOT_FOUND");
    if (cycle.state !== "draft") {
      throw new DomainError("Only a draft cycle can be started.", "NOT_DRAFT");
    }

    const auditorCount = await tx.auditCycleAuditor.count({ where: { auditCycleId } });
    if (auditorCount === 0) {
      throw new DomainError("Assign at least one auditor before starting the cycle.", "NO_AUDITORS");
    }

    // Snapshot the scope NOW — one audit_line per matching asset. This is what
    // makes the audit reproducible later even after assets move departments.
    const assets = await tx.assetAsset.findMany({
      where: {
        active: true,
        ...(cycle.scopeDepartmentId ? { departmentId: cycle.scopeDepartmentId } : {}),
        ...(cycle.scopeLocation ? { location: cycle.scopeLocation } : {}),
      },
      select: { id: true },
    });
    if (assets.length === 0) {
      throw new DomainError("No assets match this cycle's scope.", "EMPTY_SCOPE");
    }

    await tx.auditLine.createMany({
      data: assets.map((a) => ({ auditCycleId, assetId: a.id })),
      skipDuplicates: true,
    });

    const updated = await tx.auditCycle.update({
      where: { id: auditCycleId },
      data: { state: "in_progress", writeUid: actorId },
    });

    await logMessage(tx, {
      model: MODEL.AUDIT_CYCLE,
      resId: auditCycleId,
      action: "start",
      body: `Audit cycle "${cycle.name}" started — ${assets.length} asset${assets.length === 1 ? "" : "s"} in scope.`,
      authorId: actorId,
    });

    return updated;
  });
}

type MarkLineInput = {
  result: "verified" | "missing" | "damaged";
  observedCondition?: "new" | "good" | "fair" | "poor" | "damaged" | null;
  observedLocation?: string | null;
  notes?: string | null;
};

export async function markAuditLine(
  actorId: number,
  lineId: number,
  input: MarkLineInput,
  isAdmin: boolean,
) {
  return db.$transaction(async (tx) => {
    const line = await tx.auditLine.findUnique({
      where: { id: lineId },
      include: { cycle: { select: { id: true, state: true, name: true } } },
    });
    if (!line) throw new DomainError("Audit line not found.", "LINE_NOT_FOUND");
    if (line.cycle.state !== "in_progress") {
      throw new DomainError("This cycle isn't in progress.", "CYCLE_NOT_IN_PROGRESS");
    }

    if (!isAdmin) {
      const isAuditor = await tx.auditCycleAuditor.findUnique({
        where: { auditCycleId_userId: { auditCycleId: line.auditCycleId, userId: actorId } },
      });
      if (!isAuditor) {
        throw new DomainError("Only an assigned auditor can mark this line.", "NOT_AUDITOR");
      }
    }

    return tx.auditLine.update({
      where: { id: lineId },
      data: {
        result: input.result,
        auditorId: actorId,
        verifiedDate: new Date(),
        observedCondition: input.observedCondition || null,
        observedLocation: input.observedLocation || null,
        notes: input.notes || null,
        writeUid: actorId,
      },
    });
  });
}

export async function closeCycle(actorId: number, auditCycleId: number) {
  return db.$transaction(async (tx) => {
    const cycle = await tx.auditCycle.findUnique({ where: { id: auditCycleId } });
    if (!cycle) throw new DomainError("Audit cycle not found.", "CYCLE_NOT_FOUND");
    if (cycle.state !== "in_progress") {
      throw new DomainError("Only a cycle that is in progress can be closed.", "NOT_IN_PROGRESS");
    }

    const discrepancies = await tx.auditLine.findMany({
      where: { auditCycleId, result: { in: ["missing", "damaged"] } },
      include: { asset: { select: { id: true, assetTag: true, departmentId: true } } },
    });

    for (const line of discrepancies) {
      if (line.result === "missing") {
        try {
          await transitionAsset(tx, {
            assetId: line.assetId,
            to: "lost",
            actorId,
            action: "audit_lost",
            body: `Marked missing in audit cycle "${cycle.name}" — asset lost.`,
          });
        } catch (e) {
          // An asset in a state that can't jump straight to "lost" (e.g.
          // reserved) shouldn't block closing the whole cycle — flag it and
          // move on instead of rolling back every other line's outcome.
          if (e instanceof IllegalTransitionError) {
            await logMessage(tx, {
              model: MODEL.ASSET,
              resId: line.assetId,
              action: "audit_lost_blocked",
              body: `Audit cycle "${cycle.name}" flagged ${line.asset.assetTag} missing, but it couldn't move to Lost from its current state.`,
              authorId: actorId,
            });
          } else {
            throw e;
          }
        }
      } else {
        await tx.assetAsset.update({
          where: { id: line.assetId },
          data: { condition: "damaged", writeUid: actorId },
        });
        await logMessage(tx, {
          model: MODEL.ASSET,
          resId: line.assetId,
          action: "audit_damaged",
          body: `Marked damaged in audit cycle "${cycle.name}".`,
          authorId: actorId,
        });
      }

      const recipients = await approverIds(tx, line.asset.departmentId);
      await notifyMany(tx, recipients, {
        type: "audit_discrepancy",
        title: "Audit discrepancy",
        body: `${line.asset.assetTag} marked ${line.result} in "${cycle.name}".`,
        actionUrl: `/audits/${auditCycleId}`,
      });
    }

    const updated = await tx.auditCycle.update({
      where: { id: auditCycleId },
      data: { state: "closed", closedDate: new Date(), closedById: actorId, writeUid: actorId },
    });

    await logMessage(tx, {
      model: MODEL.AUDIT_CYCLE,
      resId: auditCycleId,
      action: "close",
      body: `Audit cycle "${cycle.name}" closed — ${discrepancies.length} discrepanc${discrepancies.length === 1 ? "y" : "ies"}.`,
      authorId: actorId,
    });

    return updated;
  });
}

/** Literally `where: { auditCycleId, result: { in: ["missing", "damaged"] } }`
 *  — free, because the schema was designed for it. */
export async function getDiscrepancies(auditCycleId: number) {
  return db.auditLine.findMany({
    where: { auditCycleId, result: { in: ["missing", "damaged"] } },
    include: {
      asset: { select: { id: true, name: true, assetTag: true } },
      auditor: { select: { id: true, name: true } },
    },
    orderBy: { id: "asc" },
  });
}
