import "server-only";
import { Prisma, type UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { APPROVERS } from "@/lib/rbac";
import { DomainError, BookingOverlapError, ForbiddenError } from "@/modules/core/errors";
import { logMessage, notify, MODEL } from "@/modules/core/chatter.service";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  RESOURCE BOOKING — the overlap rule
 * ══════════════════════════════════════════════════════════════════════════
 * Slots are half-open [start, end). The brief's own example: Room B2 booked
 * 9:00–10:00 → a request for 9:30–10:30 is rejected (overlaps), a request for
 * 10:00–11:00 is fine (touches, doesn't overlap). The predicate is strict:
 *   newStart < existingEnd  AND  newEnd > existingStart
 * Postgres enforces this for real via a GiST exclusion constraint
 * (`resource_booking_no_overlap`, WHERE state = 'confirmed') — the query below
 * exists purely to raise a friendly `BookingOverlapError` before we even try
 * the INSERT. The catch block is the backstop for the race a plain
 * SELECT-then-INSERT can't close.
 */

function formatRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const day = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day}, ${start.toLocaleTimeString(undefined, opts)}–${end.toLocaleTimeString(undefined, opts)}`;
}

/** True if `e` is Postgres's 23P01 (exclusion_violation) surfacing through
 *  Prisma's unmapped-error path — the race-condition backstop. */
function isExclusionViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientUnknownRequestError &&
    (e.message.includes("23P01") || e.message.includes("resource_booking_no_overlap"))
  );
}

function assertCanManage(
  booking: { userId: number },
  actor: { id: number; role: UserRole },
): void {
  if (booking.userId !== actor.id && !APPROVERS.includes(actor.role)) {
    throw new ForbiddenError("You can only manage your own bookings.");
  }
}

export async function listBookableAssets() {
  return db.assetAsset.findMany({
    where: { isBookable: true, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, assetTag: true, location: true, state: true },
  });
}

export async function getBookableAsset(assetId: number) {
  return db.assetAsset.findFirst({
    where: { id: assetId, isBookable: true, active: true },
    select: { id: true, name: true, assetTag: true, location: true },
  });
}

/** Confirmed bookings for one resource that intersect [rangeStart, rangeEnd). */
export async function listBookingsInRange(assetId: number, rangeStart: Date, rangeEnd: Date) {
  return db.resourceBooking.findMany({
    where: {
      assetId,
      state: "confirmed",
      startDatetime: { lt: rangeEnd },
      endDatetime: { gt: rangeStart },
    },
    orderBy: { startDatetime: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function listMyBookings(userId: number) {
  return db.resourceBooking.findMany({
    where: { userId },
    orderBy: { startDatetime: "desc" },
    include: { asset: { select: { id: true, name: true, assetTag: true } } },
  });
}

type CreateBookingInput = {
  assetId: number;
  userId: number;
  name: string;
  startDatetime: Date;
  endDatetime: Date;
  notes?: string | null;
};

export async function createBooking(input: CreateBookingInput) {
  return db.$transaction(async (tx) => {
    const asset = await tx.assetAsset.findFirst({
      where: { id: input.assetId, isBookable: true, active: true },
      select: { id: true, name: true, assetTag: true },
    });
    if (!asset) throw new DomainError("That resource isn't bookable.", "NOT_BOOKABLE");

    const conflict = await tx.resourceBooking.findFirst({
      where: {
        assetId: input.assetId,
        state: "confirmed",
        startDatetime: { lt: input.endDatetime },
        endDatetime: { gt: input.startDatetime },
      },
      orderBy: { startDatetime: "asc" },
    });
    if (conflict) {
      throw new BookingOverlapError(asset.name, conflict.startDatetime, conflict.endDatetime);
    }

    try {
      const created = await tx.resourceBooking.create({
        data: {
          name: input.name,
          assetId: input.assetId,
          userId: input.userId,
          startDatetime: input.startDatetime,
          endDatetime: input.endDatetime,
          notes: input.notes || null,
        },
      });

      await logMessage(tx, {
        model: MODEL.BOOKING,
        resId: created.id,
        action: "create",
        body: `${asset.assetTag} booked ${formatRange(input.startDatetime, input.endDatetime)}.`,
        authorId: input.userId,
      });

      await notify(tx, {
        userId: input.userId,
        type: "booking_confirmed",
        title: "Booking confirmed",
        body: `${asset.name} is booked for ${formatRange(input.startDatetime, input.endDatetime)}.`,
        actionUrl: `/bookings/${asset.id}`,
      });

      return created;
    } catch (e) {
      if (isExclusionViolation(e)) {
        throw new BookingOverlapError(asset.name, input.startDatetime, input.endDatetime);
      }
      throw e;
    }
  });
}

export async function cancelBooking(bookingId: number, actor: { id: number; role: UserRole }) {
  return db.$transaction(async (tx) => {
    const booking = await tx.resourceBooking.findUnique({
      where: { id: bookingId },
      include: { asset: { select: { id: true, name: true, assetTag: true } } },
    });
    if (!booking) throw new DomainError("Booking not found.", "BOOKING_NOT_FOUND");
    assertCanManage(booking, actor);
    if (booking.state === "cancelled") return booking;

    const updated = await tx.resourceBooking.update({
      where: { id: bookingId },
      data: { state: "cancelled", cancelledDate: new Date(), writeUid: actor.id },
    });

    await logMessage(tx, {
      model: MODEL.BOOKING,
      resId: booking.id,
      action: "cancel",
      body: `Booking for ${booking.asset.assetTag} (${formatRange(booking.startDatetime, booking.endDatetime)}) cancelled.`,
      authorId: actor.id,
    });

    if (booking.userId !== actor.id) {
      await notify(tx, {
        userId: booking.userId,
        type: "booking_cancelled",
        title: "Booking cancelled",
        body: `Your booking for ${booking.asset.name} was cancelled.`,
        actionUrl: `/bookings/${booking.asset.id}`,
      });
    }

    return updated;
  });
}

type RescheduleInput = { startDatetime: Date; endDatetime: Date };

export async function rescheduleBooking(
  bookingId: number,
  input: RescheduleInput,
  actor: { id: number; role: UserRole },
) {
  return db.$transaction(async (tx) => {
    const booking = await tx.resourceBooking.findUnique({
      where: { id: bookingId },
      include: { asset: { select: { id: true, name: true, assetTag: true } } },
    });
    if (!booking) throw new DomainError("Booking not found.", "BOOKING_NOT_FOUND");
    assertCanManage(booking, actor);
    if (booking.state === "cancelled") {
      throw new DomainError("A cancelled booking can't be rescheduled — make a new one.", "BOOKING_CANCELLED");
    }

    const conflict = await tx.resourceBooking.findFirst({
      where: {
        id: { not: bookingId },
        assetId: booking.assetId,
        state: "confirmed",
        startDatetime: { lt: input.endDatetime },
        endDatetime: { gt: input.startDatetime },
      },
      orderBy: { startDatetime: "asc" },
    });
    if (conflict) {
      throw new BookingOverlapError(booking.asset.name, conflict.startDatetime, conflict.endDatetime);
    }

    try {
      const updated = await tx.resourceBooking.update({
        where: { id: bookingId },
        data: {
          startDatetime: input.startDatetime,
          endDatetime: input.endDatetime,
          writeUid: actor.id,
        },
      });

      await logMessage(tx, {
        model: MODEL.BOOKING,
        resId: booking.id,
        action: "reschedule",
        body: `${booking.asset.assetTag} rescheduled to ${formatRange(input.startDatetime, input.endDatetime)}.`,
        authorId: actor.id,
      });

      return updated;
    } catch (e) {
      if (isExclusionViolation(e)) {
        throw new BookingOverlapError(booking.asset.name, input.startDatetime, input.endDatetime);
      }
      throw e;
    }
  });
}
