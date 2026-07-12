import type { BookingState } from "@prisma/client";
import { statusPill } from "@/components/ui/badge";

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
  // Ongoing means "happening right now", so it takes the live colour. Upcoming
  // is the calmer green; Completed and Cancelled recede to grey.
  Ongoing: statusPill("blue"),
  Upcoming: statusPill("emerald"),
  Completed: statusPill("zinc"),
  Cancelled: statusPill("zinc"),
};
