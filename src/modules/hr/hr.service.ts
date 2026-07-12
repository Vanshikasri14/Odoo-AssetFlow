import "server-only";
import { db, type Tx } from "@/lib/db";
import { DomainError } from "@/modules/core/errors";
import { logMessage, notify, MODEL } from "@/modules/core/chatter.service";
import { ROLE_LABEL } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
//  DEPARTMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Odoo keeps a denormalised `complete_name` ("Parent / Child") so the hierarchy
 * can be listed and searched without a recursive CTE on every read. The cost is
 * that we must keep it in sync — including for descendants, when a parent is
 * renamed or re-parented.
 */
async function recomputeCompleteName(tx: Tx, deptId: number): Promise<void> {
  const dept = await tx.hrDepartment.findUnique({
    where: { id: deptId },
    select: { id: true, name: true, parentId: true },
  });
  if (!dept) return;

  let completeName = dept.name;
  if (dept.parentId) {
    const parent = await tx.hrDepartment.findUnique({
      where: { id: dept.parentId },
      select: { completeName: true, name: true },
    });
    completeName = `${parent?.completeName ?? parent?.name} / ${dept.name}`;
  }

  await tx.hrDepartment.update({ where: { id: deptId }, data: { completeName } });

  const children = await tx.hrDepartment.findMany({
    where: { parentId: deptId },
    select: { id: true },
  });
  for (const child of children) await recomputeCompleteName(tx, child.id);
}

/** Would setting `parentId` as the parent of `deptId` create a cycle? */
async function wouldCycle(tx: Tx, deptId: number, parentId: number): Promise<boolean> {
  let cursor: number | null = parentId;
  const seen = new Set<number>();
  while (cursor) {
    if (cursor === deptId) return true;
    if (seen.has(cursor)) return true; // pre-existing cycle; don't spin forever
    seen.add(cursor);
    const row: { parentId: number | null } | null = await tx.hrDepartment.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = row?.parentId ?? null;
  }
  return false;
}

export async function listDepartments() {
  return db.hrDepartment.findMany({
    orderBy: [{ sequence: "asc" }, { name: "asc" }],
    include: {
      manager: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
      _count: { select: { members: true, assets: true } },
    },
  });
}

export async function upsertDepartment(
  actorId: number,
  input: { id?: number; name: string; parentId: number | null; managerId: number | null },
) {
  return db.$transaction(async (tx) => {
    if (input.id && input.parentId) {
      if (input.parentId === input.id) {
        throw new DomainError("A department cannot be its own parent.", "SELF_PARENT");
      }
      if (await wouldCycle(tx, input.id, input.parentId)) {
        throw new DomainError(
          "That would create a loop in the department hierarchy.",
          "HIERARCHY_CYCLE",
        );
      }
    }

    const dept = input.id
      ? await tx.hrDepartment.update({
          where: { id: input.id },
          data: {
            name: input.name,
            parentId: input.parentId,
            managerId: input.managerId,
            writeUid: actorId,
          },
        })
      : await tx.hrDepartment.create({
          data: {
            name: input.name,
            parentId: input.parentId,
            managerId: input.managerId,
            createUid: actorId,
            writeUid: actorId,
          },
        });

    await recomputeCompleteName(tx, dept.id);

    // Making someone a Department Head IS a role grant. Do it here too, so the
    // two never drift apart — a head who isn't a dept_head can't approve anything.
    if (input.managerId) {
      const manager = await tx.resUsers.findUnique({
        where: { id: input.managerId },
        select: { id: true, role: true, name: true },
      });
      if (manager && manager.role === "employee") {
        await tx.resUsers.update({
          where: { id: manager.id },
          data: { role: "dept_head", writeUid: actorId },
        });
        await notify(tx, {
          userId: manager.id,
          type: "role_changed",
          title: "You are now a Department Head",
          body: `You have been made head of ${input.name}.`,
          actionUrl: "/dashboard",
        });
      }
    }

    await logMessage(tx, {
      model: MODEL.DEPARTMENT,
      resId: dept.id,
      action: input.id ? "write" : "create",
      body: `Department "${dept.name}" ${input.id ? "updated" : "created"}.`,
      authorId: actorId,
    });

    return dept;
  });
}

/** Archive, never delete — assets and allocations still point at this row. */
export async function setDepartmentActive(actorId: number, id: number, active: boolean) {
  return db.$transaction(async (tx) => {
    if (!active) {
      const members = await tx.resUsers.count({ where: { departmentId: id, active: true } });
      if (members > 0) {
        throw new DomainError(
          `${members} active employee${members === 1 ? "" : "s"} still belong to this department. Move them first.`,
          "DEPARTMENT_NOT_EMPTY",
        );
      }
    }
    const dept = await tx.hrDepartment.update({
      where: { id },
      data: { active, writeUid: actorId },
    });
    await logMessage(tx, {
      model: MODEL.DEPARTMENT,
      resId: id,
      action: active ? "unarchive" : "archive",
      body: `Department "${dept.name}" ${active ? "reactivated" : "deactivated"}.`,
      authorId: actorId,
    });
    return dept;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ASSET CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export async function listCategories() {
  return db.assetCategory.findMany({
    orderBy: [{ sequence: "asc" }, { name: "asc" }],
    include: { _count: { select: { assets: true } } },
  });
}

export async function upsertCategory(
  actorId: number,
  input: {
    id?: number;
    name: string;
    code?: string | null;
    description?: string | null;
    warrantyMonths: number | null;
  },
) {
  return db.$transaction(async (tx) => {
    const data = {
      name: input.name,
      code: input.code || null,
      description: input.description || null,
      warrantyMonths: input.warrantyMonths,
      writeUid: actorId,
    };

    const cat = input.id
      ? await tx.assetCategory.update({ where: { id: input.id }, data })
      : await tx.assetCategory.create({ data: { ...data, createUid: actorId } });

    await logMessage(tx, {
      model: MODEL.CATEGORY,
      resId: cat.id,
      action: input.id ? "write" : "create",
      body: `Category "${cat.name}" ${input.id ? "updated" : "created"}.`,
      authorId: actorId,
    });

    return cat;
  });
}

export async function setCategoryActive(actorId: number, id: number, active: boolean) {
  return db.$transaction(async (tx) => {
    if (!active) {
      const assets = await tx.assetAsset.count({ where: { categoryId: id, active: true } });
      if (assets > 0) {
        throw new DomainError(
          `${assets} active asset${assets === 1 ? "" : "s"} still use this category.`,
          "CATEGORY_IN_USE",
        );
      }
    }
    const cat = await tx.assetCategory.update({
      where: { id },
      data: { active, writeUid: actorId },
    });
    await logMessage(tx, {
      model: MODEL.CATEGORY,
      resId: id,
      action: active ? "unarchive" : "archive",
      body: `Category "${cat.name}" ${active ? "reactivated" : "deactivated"}.`,
      authorId: actorId,
    });
    return cat;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  EMPLOYEE DIRECTORY  —  the only place roles are assigned
// ─────────────────────────────────────────────────────────────────────────────

export async function listEmployees() {
  return db.resUsers.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { department: { select: { id: true, name: true } } },
  });
}

/**
 * ⭐ THE ONLY WRITER OF `res_users.role` IN THE APPLICATION.
 *
 * Everything else about the security model is a consequence of this function
 * existing exactly once, behind exactly one guard.
 *
 * Two safeguards worth noting:
 *  • `admin` cannot be granted here. Minting new admins from the UI is how a
 *    single compromised admin session becomes a permanent one. Seed an admin, or
 *    promote deliberately in the database.
 *  • You cannot change your OWN role. An admin who demotes themselves by
 *    misclicking locks the organisation out of its own settings.
 */
export async function promoteUser(actorId: number, userId: number, role: UserRole) {
  if (userId === actorId) {
    throw new DomainError("You cannot change your own role.", "SELF_ROLE_CHANGE");
  }
  if (role === "admin") {
    throw new DomainError("Admin cannot be granted from the directory.", "ADMIN_NOT_GRANTABLE");
  }

  return db.$transaction(async (tx) => {
    const target = await tx.resUsers.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!target) throw new DomainError("That user no longer exists.", "USER_NOT_FOUND");
    if (target.role === "admin") {
      throw new DomainError("An administrator's role cannot be changed here.", "TARGET_IS_ADMIN");
    }
    if (target.role === role) return target; // no-op

    const from = target.role;

    // A Department Head being demoted must not stay listed as a department's head.
    if (from === "dept_head" && role !== "dept_head") {
      await tx.hrDepartment.updateMany({
        where: { managerId: userId },
        data: { managerId: null },
      });
    }

    const updated = await tx.resUsers.update({
      where: { id: userId },
      data: { role, writeUid: actorId },
      select: { id: true, name: true, role: true },
    });

    await logMessage(tx, {
      model: MODEL.USER,
      resId: userId,
      action: "promote",
      body: `${updated.name}: ${ROLE_LABEL[from]} → ${ROLE_LABEL[role]}.`,
      authorId: actorId,
      payload: { from, to: role },
    });

    await notify(tx, {
      userId,
      type: "role_changed",
      title: "Your role has changed",
      body: `You are now ${ROLE_LABEL[role]}.`,
      actionUrl: "/dashboard",
    });

    return updated;
  });
}

export async function assignDepartment(
  actorId: number,
  userId: number,
  departmentId: number | null,
) {
  return db.$transaction(async (tx) => {
    const user = await tx.resUsers.update({
      where: { id: userId },
      data: { departmentId, writeUid: actorId },
      include: { department: { select: { name: true } } },
    });
    await logMessage(tx, {
      model: MODEL.USER,
      resId: userId,
      action: "assign_department",
      body: `${user.name} moved to ${user.department?.name ?? "no department"}.`,
      authorId: actorId,
    });
    return user;
  });
}

export async function setUserActive(actorId: number, userId: number, active: boolean) {
  if (userId === actorId) {
    throw new DomainError("You cannot deactivate your own account.", "SELF_DEACTIVATE");
  }

  return db.$transaction(async (tx) => {
    if (!active) {
      // Deactivating someone who still holds assets orphans them — the asset
      // stays "allocated" to a person who can no longer be asked to return it.
      const held = await tx.assetAllocation.count({
        where: { holderUserId: userId, returnedDate: null },
      });
      if (held > 0) {
        throw new DomainError(
          `They still hold ${held} asset${held === 1 ? "" : "s"}. Process the return or transfer first.`,
          "USER_HOLDS_ASSETS",
        );
      }
    }

    const user = await tx.resUsers.update({
      where: { id: userId },
      data: { active, writeUid: actorId },
      select: { id: true, name: true },
    });

    await logMessage(tx, {
      model: MODEL.USER,
      resId: userId,
      action: active ? "activate" : "deactivate",
      body: `${user.name} ${active ? "reactivated" : "deactivated"}.`,
      authorId: actorId,
    });

    return user;
  });
}
