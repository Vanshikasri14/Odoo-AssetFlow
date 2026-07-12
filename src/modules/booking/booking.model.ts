import type { BookingState } from "@prisma/client";

/**
 * Only `cancelled` is a persisted decision. Upcoming / Ongoing / Completed are
 * derived from (now, start, end) on every read — see prisma/schema.prisma's
 * note on BookingState. A stored status would go stale the first time a cron
 * job didn't fire.
 */
export type DisplayStatus = "Cancelled" | "Ongoing" | "Upcoming" | "Completed";

export function displayStatus(
  booking: { state: BookingState; startDatetime: Date; endDatetime: Date },
  now: Date = new Date(),
): DisplayStatus {
  if (booking.state === "cancelled") return "Cancelled";
  if (now < booking.startDatetime) return "Upcoming";
  if (now < booking.endDatetime) return "Ongoing";
  return "Completed";
}

export const DISPLAY_STATUS_BADGE: Record<DisplayStatus, string> = {
  Cancelled: "bg-slate-100 text-slate-500 ring-slate-400/20",
  Upcoming: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Ongoing: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Completed: "bg-zinc-100 text-zinc-600 ring-zinc-400/20",
};
