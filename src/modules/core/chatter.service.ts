import type { Tx } from "@/lib/db";
import type { NotificationType, Prisma } from "@prisma/client";

/**
 * The "chatter" — Odoo's mail.thread, in miniature.
 *
 * Every state change in the system funnels through here, which is why the
 * Activity Log, the per-asset history timeline and the notification bell all
 * come out of ONE table and require no bespoke wiring per feature.
 *
 * Always call these inside the same transaction as the change they describe.
 * A rolled-back allocation must not leave behind a log entry that says it
 * happened.
 */

/** Odoo-style dotted model names — the polymorphic key of mail_message. */
export const MODEL = {
  ASSET: "asset.asset",
  ALLOCATION: "asset.allocation",
  TRANSFER: "asset.transfer.request",
  BOOKING: "resource.booking",
  MAINTENANCE: "maintenance.request",
  AUDIT_CYCLE: "audit.cycle",
  DEPARTMENT: "hr.department",
  CATEGORY: "asset.category",
  USER: "res.users",
} as const;

export type ModelName = (typeof MODEL)[keyof typeof MODEL];

type LogArgs = {
  model: ModelName;
  resId: number;
  /** Machine verb: 'create' | 'allocate' | 'return' | 'approve' | 'reject' | … */
  action: string;
  /** The line a human reads: "Allocated AF-0114 to Priya Sharma." */
  body: string;
  authorId: number | null;
  payload?: Prisma.InputJsonValue;
};

/** Append to the audit trail. Returns the message, so notifications can link to it. */
export async function logMessage(tx: Tx, args: LogArgs) {
  return tx.mailMessage.create({
    data: {
      model: args.model,
      resId: args.resId,
      action: args.action,
      body: args.body,
      authorId: args.authorId,
      payload: args.payload,
    },
  });
}

type NotifyArgs = {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  /** Deep link the bell dropdown navigates to, e.g. "/assets/14". */
  actionUrl?: string;
  messageId?: number;
};

export async function notify(tx: Tx, args: NotifyArgs) {
  return tx.mailNotification.create({ data: args });
}

/** Fan a single notification out to several recipients (de-duplicated). */
export async function notifyMany(tx: Tx, userIds: number[], args: Omit<NotifyArgs, "userId">) {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  await tx.mailNotification.createMany({
    data: unique.map((userId) => ({ ...args, userId })),
  });
}

/**
 * Recipients for approval-type events: every Asset Manager and Admin, plus the
 * head of the relevant department if one is given.
 */
export async function approverIds(tx: Tx, departmentId?: number | null): Promise<number[]> {
  const managers = await tx.resUsers.findMany({
    where: { active: true, role: { in: ["admin", "asset_manager"] } },
    select: { id: true },
  });

  const ids = managers.map((m) => m.id);

  if (departmentId) {
    const dept = await tx.hrDepartment.findUnique({
      where: { id: departmentId },
      select: { managerId: true },
    });
    if (dept?.managerId) ids.push(dept.managerId);
  }

  return [...new Set(ids)];
}
