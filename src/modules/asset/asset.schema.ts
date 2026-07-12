import { z } from "zod";
import { AssetCondition, AssetState } from "@prisma/client";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? null : (v ?? null)));

const optionalNumber = z
  .string()
  .optional()
  .transform((v) => (v === "" || v == null ? null : Number(v)))
  .pipe(z.number().min(0).nullable());

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v === "" || v == null ? null : new Date(v)))
  .pipe(z.date().nullable());

export const assetSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, "Give the asset a name."),
  categoryId: z.coerce.number().int().positive("Pick a category."),
  departmentId: z
    .string()
    .transform((v) => (v === "" || v === "none" ? null : Number(v)))
    .pipe(z.number().int().positive().nullable()),

  serialNo: optionalText,
  acquisitionDate: optionalDate,
  /** Kept for ranking and reports only. The brief excludes accounting. */
  acquisitionCost: optionalNumber,
  condition: z.enum(AssetCondition),
  location: optionalText,
  imageUrl: optionalText,
  notes: optionalText,

  /** Marks the asset as a shared resource that can be booked by time slot.
   *  This is the flag that puts it on Dev B's booking screen. */
  isBookable: z
    .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined()])
    .transform((v) => v === "on" || v === "true"),
});

/** Search + filter state, parsed straight from the URL's searchParams. */
export const assetFilterSchema = z.object({
  q: z.string().trim().optional().default(""),
  category: z.coerce.number().int().positive().optional(),
  state: z.enum(AssetState).optional(),
  department: z.coerce.number().int().positive().optional(),
  location: z.string().trim().optional(),
  bookable: z.enum(["1", "0"]).optional(),
});

export type AssetFilters = z.infer<typeof assetFilterSchema>;

export const CONDITION_LABEL: Record<AssetCondition, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
};

export type AssetFormState =
  | { ok?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;
