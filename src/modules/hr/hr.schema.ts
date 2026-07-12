import { z } from "zod";

const optionalId = z
  .string()
  .transform((v) => (v === "" || v === "none" ? null : Number(v)))
  .pipe(z.number().int().positive().nullable());

export const departmentSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, "Department name is required."),
  parentId: optionalId,
  managerId: optionalId,
});

export const categorySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, "Category name is required."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .max(6, "Keep the code short — 6 characters or fewer.")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  /** Category-specific field, per the brief's "warranty period for Electronics". */
  warrantyMonths: z
    .string()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(0).max(600).nullable()),
});

/**
 * The role-assignment schema.
 *
 * This is the ONE place in the entire codebase where a role can be chosen, and
 * it is reachable only through an action guarded by `assertRole(["admin"])`.
 * Note `admin` is absent from the list on purpose — see promoteUser().
 */
export const promoteSchema = z.object({
  userId: z.coerce.number().int().positive(),
  role: z.enum(["employee", "dept_head", "asset_manager"]),
});

export const assignDepartmentSchema = z.object({
  userId: z.coerce.number().int().positive(),
  departmentId: optionalId,
});

export const toggleActiveSchema = z.object({
  userId: z.coerce.number().int().positive(),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export type ActionState =
  | { ok?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;
