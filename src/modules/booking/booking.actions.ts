"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { DomainError, ForbiddenError } from "@/modules/core/errors";
import * as booking from "./booking.service";
import {
  createBookingSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  type ActionState,
} from "./booking.schema";

/** Any signed-in employee may book a resource — there's no role gate here,
 *  just a login check (mirrors what `assertRole` does internally). */
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("You are not signed in.");
  return user;
}

async function run(fn: () => Promise<unknown>, path: string, ok: string): Promise<ActionState> {
  try {
    await fn();
    revalidatePath(path);
    revalidatePath("/bookings");
    return { ok };
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
}

export async function createBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAuth();

  const parsed = createBookingSchema.safeParse({
    assetId: formData.get("assetId"),
    name: formData.get("name"),
    startDatetime: formData.get("startDatetime"),
    endDatetime: formData.get("endDatetime"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  return run(
    () => booking.createBooking({ ...parsed.data, userId: me.id }),
    `/bookings/${parsed.data.assetId}`,
    "Booking confirmed.",
  );
}

export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAuth();

  const parsed = cancelBookingSchema.safeParse({ bookingId: formData.get("bookingId") });
  if (!parsed.success) return { error: "Invalid request." };

  const assetId = String(formData.get("assetId") ?? "");
  return run(
    () => booking.cancelBooking(parsed.data.bookingId, { id: me.id, role: me.role }),
    assetId ? `/bookings/${assetId}` : "/bookings",
    "Booking cancelled.",
  );
}

export async function rescheduleBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAuth();

  const parsed = rescheduleBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    startDatetime: formData.get("startDatetime"),
    endDatetime: formData.get("endDatetime"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const assetId = String(formData.get("assetId") ?? "");
  return run(
    () =>
      booking.rescheduleBooking(
        parsed.data.bookingId,
        { startDatetime: parsed.data.startDatetime, endDatetime: parsed.data.endDatetime },
        { id: me.id, role: me.role },
      ),
    assetId ? `/bookings/${assetId}` : "/bookings",
    "Booking rescheduled.",
  );
}
