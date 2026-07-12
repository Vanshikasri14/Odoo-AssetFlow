import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

/**
 * Notifications and the activity log.
 *
 * There is almost no code here, and that is the point. Every feature in the
 * application — allocation, transfer, return, booking, maintenance, audit —
 * has been writing to `mail_message` and `mail_notification` inside the same
 * transaction as the change it made, all day. Both screens are just reads.
 *
 * This is what "reusable modules" bought us: nobody had to build a notification
 * system. It accumulated.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  NOTIFICATIONS  (mail_notification — the fan-out of a message to a recipient)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: number) {
  return db.mailNotification.count({ where: { userId, isRead: false } });
}

export async function listNotifications(userId: number, limit = 30) {
  return db.mailNotification.findMany({
    where: { userId },
    orderBy: [{ isRead: "asc" }, { createDate: "desc" }],
    take: limit,
  });
}

export async function markRead(userId: number, id: number) {
  // Scoped by userId, so you cannot mark someone else's notification read by
  // guessing an id.
  return db.mailNotification.updateMany({
    where: { id, userId },
    data: { isRead: true, readDate: new Date() },
  });
}

export async function markAllRead(userId: number) {
  return db.mailNotification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readDate: new Date() },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVITY LOG  (mail_message — "who did what, when")
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityFilters = {
  model?: string;
  actor?: number;
  action?: string;
  q?: string;
};

/**
 * The brief: "Full audit log of admin/manager/employee actions (who did what,
 * when)."
 *
 * Employees see only their own actions. Managers see the organisation. An audit
 * log that everyone can read in full isn't an audit log, it's a surveillance
 * feed — and it would leak, for instance, which departments are being audited.
 */
export async function listActivity(user: SessionUser, filters: ActivityFilters, limit = 100) {
  const where: Prisma.MailMessageWhereInput = {};

  if (!can.viewAllAnalytics(user)) {
    where.authorId = user.id;
  } else if (filters.actor) {
    where.authorId = filters.actor;
  }

  if (filters.model) where.model = filters.model;
  if (filters.action) where.action = filters.action;
  if (filters.q) where.body = { contains: filters.q, mode: "insensitive" };

  return db.mailMessage.findMany({
    where,
    orderBy: { createDate: "desc" },
    include: { author: { select: { id: true, name: true } } },
    take: limit,
  });
}

/** Distinct values actually present in the log, for the filter dropdowns —
 *  so we never offer a filter that would return nothing. */
export async function getActivityFilterOptions(user: SessionUser) {
  if (!can.viewAllAnalytics(user)) return { actors: [], models: [], actions: [] };

  const [models, actions, actors] = await Promise.all([
    db.mailMessage.findMany({ distinct: ["model"], select: { model: true }, orderBy: { model: "asc" } }),
    db.mailMessage.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.resUsers.findMany({
      where: { messages: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    models: models.map((m) => m.model),
    actions: actions.map((a) => a.action),
    actors,
  };
}
