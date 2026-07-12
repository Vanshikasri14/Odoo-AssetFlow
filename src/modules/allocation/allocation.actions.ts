"use server";

import { revalidatePath } from "next/cache";
import { assertRole, APPROVERS, ASSET_WRITERS } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/auth";
import { AssetAlreadyAllocatedError, DomainError, ForbiddenError } from "@/modules/core/errors";
import {
  allocateSchema,
  returnSchema,
  transferDecisionSchema,
  transferRequestSchema,
  type AllocationFormState,
} from "./allocation.schema";
import * as svc from "./allocation.service";

function revalidate() {
  revalidatePath("/allocations");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

/**
 * Allocate an asset.
 *
 * The interesting path here is the FAILURE path. When the asset is already held,
 * we don't return a bare error string — we return `conflict`, carrying the
 * holder's name and the asset. The UI turns that into:
 *
 *     "AF-0101 is currently held by Priya Sharma."   [ Request transfer ]
 *
 * which is the brief's requirement in full: block, name, and offer the way out.
 */
export async function allocate(
  _prev: AllocationFormState,
  formData: FormData,
): Promise<AllocationFormState> {
  const me = await assertRole(ASSET_WRITERS);

  const parsed = allocateSchema.safeParse({
    assetId: formData.get("assetId"),
    holder: formData.get("holder") ?? "",
    expectedReturnDate: formData.get("expectedReturnDate") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await svc.allocateAsset(me.id, {
      assetId: parsed.data.assetId,
      ...parsed.data.holder,
      expectedReturnDate: parsed.data.expectedReturnDate,
      notes: parsed.data.notes,
    });
  } catch (e) {
    if (e instanceof AssetAlreadyAllocatedError) {
      const meta = e.meta as { assetTag: string; holderName: string; holderId: number | null };
      return {
        error: e.message,
        conflict: {
          assetId: parsed.data.assetId,
          assetTag: meta.assetTag,
          holderName: meta.holderName,
          holderId: meta.holderId,
        },
      };
    }
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }

  revalidate();
  return { ok: "Asset allocated." };
}

export async function returnAsset(
  _prev: AllocationFormState,
  formData: FormData,
): Promise<AllocationFormState> {
  const me = await getCurrentUser();
  if (!me) throw new ForbiddenError("You are not signed in.");

  const parsed = returnSchema.safeParse({
    allocationId: formData.get("allocationId"),
    checkinCondition: formData.get("checkinCondition"),
    checkinNotes: formData.get("checkinNotes") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await svc.returnAsset(me, parsed.data.allocationId, {
      checkinCondition: parsed.data.checkinCondition,
      checkinNotes: parsed.data.checkinNotes,
    });
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }

  revalidate();
  return { ok: "Asset returned and back in stock." };
}

/** Anyone signed in may ASK for a transfer — that's the point of the escape hatch. */
export async function requestTransfer(
  _prev: AllocationFormState,
  formData: FormData,
): Promise<AllocationFormState> {
  const me = await getCurrentUser();
  if (!me) throw new ForbiddenError("You are not signed in.");

  const parsed = transferRequestSchema.safeParse({
    assetId: formData.get("assetId"),
    toUserId: formData.get("toUserId"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await svc.requestTransfer(me.id, parsed.data);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }

  revalidate();
  return { ok: "Transfer requested. An Asset Manager will review it." };
}

/** But only an approver may GRANT one. */
export async function approveTransfer(
  _prev: AllocationFormState,
  formData: FormData,
): Promise<AllocationFormState> {
  const me = await assertRole(APPROVERS);

  const parsed = transferDecisionSchema.safeParse({
    transferId: formData.get("transferId"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  try {
    await svc.approveTransfer(me.id, parsed.data.transferId);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }

  revalidate();
  return { ok: "Transfer approved — the asset has changed hands." };
}

export async function rejectTransfer(
  _prev: AllocationFormState,
  formData: FormData,
): Promise<AllocationFormState> {
  const me = await assertRole(APPROVERS);

  const parsed = transferDecisionSchema.safeParse({
    transferId: formData.get("transferId"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: "Invalid request." };

  try {
    await svc.rejectTransfer(me.id, parsed.data.transferId, parsed.data.reason);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }

  revalidate();
  return { ok: "Transfer rejected." };
}
