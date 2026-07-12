import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { overdueWhere } from "@/modules/allocation/allocation.service";

/**
 * Dashboard data.
 *
 * Two principles here, both worth stating out loud:
 *
 * 1. NOTHING IS STORED. Every number is computed from the source tables at read
 *    time. There is no `stats` table, no `is_overdue` column, no nightly job.
 *    A denormalised counter is a counter that is wrong the first time its
 *    updater doesn't run — and on a dashboard, a wrong number is worse than no
 *    number, because people act on it.
 *
 * 2. OVERDUE USES THE SAME PREDICATE AS THE ALLOCATIONS SCREEN. It's imported,
 *    not re-typed (`overdueWhere()`), so the dashboard and the allocations page
 *    physically cannot disagree about what "overdue" means.
 */

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export type Kpis = {
  assetsAvailable: number;
  assetsAllocated: number;
  underMaintenance: number;
  maintenanceToday: number;
  activeBookings: number;
  pendingTransfers: number;
  pendingMaintenance: number;
  upcomingReturns: number;
  overdueReturns: number;
  totalAssets: number;
};

/** Organisation-wide numbers — what an Admin or Asset Manager sees. */
export async function getOrgKpis(): Promise<Kpis> {
  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 86_400_000);

  const [byState, maintenanceToday, activeBookings, pendingTransfers, pendingMaintenance, upcoming, overdue, total] =
    await Promise.all([
      db.assetAsset.groupBy({
        by: ["state"],
        where: { active: true },
        _count: true,
      }),

      // "Maintenance Today" = work actually in flight, not requests sitting in a
      // queue. Those are counted separately as pendingMaintenance.
      db.maintenanceRequest.count({
        where: {
          state: { in: ["approved", "assigned", "in_progress"] },
          OR: [
            { approvedDate: { gte: startOfToday(), lte: endOfToday() } },
            { state: "in_progress" },
          ],
        },
      }),

      // A booking is "active" if it is confirmed and hasn't finished yet.
      db.resourceBooking.count({
        where: { state: "confirmed", endDatetime: { gte: now } },
      }),

      db.assetTransferRequest.count({ where: { state: "pending" } }),

      db.maintenanceRequest.count({ where: { state: "pending" } }),

      // Due back in the next week, and not late yet.
      db.assetAllocation.count({
        where: {
          returnedDate: null,
          expectedReturnDate: { gte: now, lte: in7Days },
        },
      }),

      db.assetAllocation.count({ where: overdueWhere() }),

      db.assetAsset.count({ where: { active: true } }),
    ]);

  const count = (s: string) => byState.find((b) => b.state === s)?._count ?? 0;

  return {
    assetsAvailable: count("available"),
    assetsAllocated: count("allocated"),
    underMaintenance: count("under_maintenance"),
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    pendingMaintenance,
    upcomingReturns: upcoming,
    overdueReturns: overdue,
    totalAssets: total,
  };
}

/** The same shape, but scoped to one person — what an Employee sees. */
export async function getMyKpis(userId: number): Promise<Kpis> {
  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 86_400_000);

  const [held, upcoming, overdue, bookings, transfers, maintenance] = await Promise.all([
    db.assetAllocation.count({ where: { holderUserId: userId, returnedDate: null } }),
    db.assetAllocation.count({
      where: {
        holderUserId: userId,
        returnedDate: null,
        expectedReturnDate: { gte: now, lte: in7Days },
      },
    }),
    db.assetAllocation.count({ where: { holderUserId: userId, ...overdueWhere() } }),
    db.resourceBooking.count({
      where: { userId, state: "confirmed", endDatetime: { gte: now } },
    }),
    db.assetTransferRequest.count({
      where: { state: "pending", OR: [{ requestedById: userId }, { fromUserId: userId }] },
    }),
    db.maintenanceRequest.count({
      where: { requestedById: userId, state: { in: ["pending", "approved", "assigned", "in_progress"] } },
    }),
  ]);

  return {
    assetsAvailable: 0,
    assetsAllocated: held,
    underMaintenance: 0,
    maintenanceToday: maintenance,
    activeBookings: bookings,
    pendingTransfers: transfers,
    pendingMaintenance: 0,
    upcomingReturns: upcoming,
    overdueReturns: overdue,
    totalAssets: held,
  };
}

const RETURN_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true } },
  holderUser: { select: { id: true, name: true } },
  holderDept: { select: { id: true, name: true } },
} as const;

/**
 * The brief: "Overdue returns (past Expected Return Date) highlighted separately
 * from upcoming ones." Two queries, deliberately — so the UI can't accidentally
 * blend them into one list where the urgent items get lost among the routine.
 */
export async function getReturns(user: SessionUser) {
  const scoped = can.viewAllAnalytics(user) ? {} : { holderUserId: user.id };
  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 86_400_000);

  const [overdue, upcoming] = await Promise.all([
    db.assetAllocation.findMany({
      where: { ...scoped, ...overdueWhere() },
      orderBy: { expectedReturnDate: "asc" }, // most overdue first
      include: RETURN_INCLUDE,
      take: 10,
    }),
    db.assetAllocation.findMany({
      where: {
        ...scoped,
        returnedDate: null,
        expectedReturnDate: { gte: now, lte: in7Days },
      },
      orderBy: { expectedReturnDate: "asc" },
      include: RETURN_INCLUDE,
      take: 10,
    }),
  ]);

  return { overdue, upcoming };
}

/** Today's bookings — "what's happening in the building right now". */
export async function getTodaysBookings(user: SessionUser) {
  const scoped = can.viewAllAnalytics(user) ? {} : { userId: user.id };

  return db.resourceBooking.findMany({
    where: {
      ...scoped,
      state: "confirmed",
      startDatetime: { gte: startOfToday(), lte: endOfToday() },
    },
    orderBy: { startDatetime: "asc" },
    include: {
      asset: { select: { id: true, name: true, assetTag: true } },
      user: { select: { id: true, name: true } },
    },
    take: 8,
  });
}

/** Things waiting on THIS user to make a decision. */
export async function getPendingApprovals(user: SessionUser) {
  if (!can.approve(user)) return { transfers: [], maintenance: [] };

  const [transfers, maintenance] = await Promise.all([
    db.assetTransferRequest.findMany({
      where: { state: "pending" },
      orderBy: { createDate: "asc" },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
      },
      take: 5,
    }),
    db.maintenanceRequest.findMany({
      where: { state: "pending" },
      orderBy: [{ priority: "desc" }, { createDate: "asc" }],
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        requestedBy: { select: { name: true } },
      },
      take: 5,
    }),
  ]);

  return { transfers, maintenance };
}

/** The organisation's most recent activity — straight from the chatter. */
export async function getRecentActivity(limit = 8) {
  return db.mailMessage.findMany({
    orderBy: { createDate: "desc" },
    include: { author: { select: { id: true, name: true } } },
    take: limit,
  });
}
