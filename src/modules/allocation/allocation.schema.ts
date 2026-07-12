import { z } from "zod";
import { AssetCondition } from "@prisma/client";

/**
 * Allocation is to a PERSON or a DEPARTMENT, never both and never neither —
 * mirroring the CHECK constraint `asset_allocation_holder_xor` in the database.
 * The form sends one radio-selected holder, encoded as "user:12" or "dept:3".
 */
const holder = z
  .string()
  .regex(/^(user|dept):\d+$/, "Choose who receives the asset.")
  .transform((v) => {
    const [kind, id] = v.split(":");
    return kind === "user"
      ? { holderUserId: Number(id), holderDeptId: null }
      : { holderUserId: null, holderDeptId: Number(id) };
  });

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v === "" || v == null ? null : new Date(v)))
  .pipe(z.date().nullable());

export const allocateSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  holder,
  expectedReturnDate: optionalDate,
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
});

export const returnSchema = z.object({
  allocationId: z.coerce.number().int().positive(),
  checkinCondition: z.enum(AssetCondition),
  checkinNotes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
});

export const transferRequestSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  toUserId: z.coerce.number().int().positive("Choose who should receive it."),
  reason: z
    .string()
    .trim()
    .min(1, "Say why you need it — the approver will read this.")
    .max(280),
});

export const transferDecisionSchema = z.object({
  transferId: z.coerce.number().int().positive(),
  reason: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? null : (v ?? null))),
});

/**
 * The action's return shape.
 *
 * `conflict` is the important one. When allocation is refused because someone
 * already holds the asset, we don't just fail — we hand the UI everything it
 * needs to offer the way forward: who has it, and the asset to raise a transfer
 * against. The brief: "shows him 'currently held by Priya,' and offers a
 * Transfer Request button instead."
 */
export type AllocationFormState =
  | {
      ok?: string;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      conflict?: {
        assetId: number;
        assetTag: string;
        holderName: string;
        holderId: number | null;
      };
    }
  | undefined;
