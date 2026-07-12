import { z } from "zod";

const optionalId = z
  .string()
  .transform((v) => (v === "" || v === "none" ? null : Number(v)))
  .pipe(z.number().int().positive().nullable());

export const createCycleSchema = z
  .object({
    name: z.string().trim().min(2, "Give the cycle a name.").max(120),
    scopeDepartmentId: optionalId,
    scopeLocation: z.string().trim().max(120).optional().or(z.literal("")),
    dateStart: z.coerce.date(),
    dateEnd: z.coerce.date(),
  })
  .refine((d) => d.dateEnd >= d.dateStart, {
    message: "End date must be on or after the start date.",
    path: ["dateEnd"],
  });

export const cycleIdSchema = z.object({
  auditCycleId: z.coerce.number().int().positive(),
});

export const assignAuditorsSchema = z.object({
  auditCycleId: z.coerce.number().int().positive(),
  userIds: z.array(z.coerce.number().int().positive()).default([]),
});

export const markLineSchema = z.object({
  lineId: z.coerce.number().int().positive(),
  result: z.enum(["verified", "missing", "damaged"]),
  observedCondition: z
    .enum(["new", "good", "fair", "poor", "damaged"])
    .optional()
    .or(z.literal("")),
  observedLocation: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ActionState =
  | { ok?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;
