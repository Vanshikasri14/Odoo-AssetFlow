import { z } from "zod";

export const raiseMaintenanceSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Give this request a short title.").max(120),
  description: z.string().trim().min(5, "Describe the issue.").max(1000),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  imageUrl: z.string().trim().url("Enter a valid URL.").optional().or(z.literal("")),
});

export const requestIdSchema = z.object({
  requestId: z.coerce.number().int().positive(),
});

export const rejectMaintenanceSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  rejectReason: z.string().trim().min(3, "Give a reason.").max(500),
});

export const assignTechnicianSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  technicianId: z.coerce.number().int().positive(),
});

export const resolveMaintenanceSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  resolutionNotes: z.string().trim().min(3, "Describe what was done.").max(1000),
  repairCost: z
    .string()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().min(0).max(9_999_999).nullable()),
});

export type ActionState =
  | { ok?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;
