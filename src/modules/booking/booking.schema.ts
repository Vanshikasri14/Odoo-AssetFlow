import { z } from "zod";

/** `<input type="datetime-local">` gives "YYYY-MM-DDTHH:mm" — no offset, so
 *  JS parses it in the server's local time zone, same as the browser's. */
const dateTimeLocal = z
  .string()
  .min(1, "Required")
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "Enter a valid date and time.");

export const createBookingSchema = z
  .object({
    assetId: z.coerce.number().int().positive(),
    name: z.string().trim().min(2, "Give this booking a purpose.").max(120),
    startDatetime: dateTimeLocal,
    endDatetime: dateTimeLocal,
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.endDatetime > data.startDatetime, {
    message: "End time must be after the start time.",
    path: ["endDatetime"],
  });

export const cancelBookingSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

export const rescheduleBookingSchema = z
  .object({
    bookingId: z.coerce.number().int().positive(),
    startDatetime: dateTimeLocal,
    endDatetime: dateTimeLocal,
  })
  .refine((data) => data.endDatetime > data.startDatetime, {
    message: "End time must be after the start time.",
    path: ["endDatetime"],
  });

export type ActionState =
  | { ok?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;
