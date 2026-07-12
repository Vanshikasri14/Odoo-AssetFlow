"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { assertRole, APPROVERS } from "@/lib/rbac";
import { DomainError, ForbiddenError } from "@/modules/core/errors";
import * as maintenance from "./maintenance.service";
import {
  raiseMaintenanceSchema,
  requestIdSchema,
  rejectMaintenanceSchema,
  assignTechnicianSchema,
  resolveMaintenanceSchema,
  type ActionState,
} from "./maintenance.schema";

/** Raising a request, starting work and resolving it just need a login — the
 *  role-specific gates (approve/reject/assign) use `assertRole` instead. */
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("You are not signed in.");
  return user;
}

async function run(fn: () => Promise<unknown>, ok: string): Promise<ActionState> {
  try {
    await fn();
    revalidatePath("/maintenance");
    return { ok };
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
}

export async function raiseMaintenanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAuth();

  const parsed = raiseMaintenanceSchema.safeParse({
    assetId: formData.get("assetId"),
    name: formData.get("name"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    imageUrl: formData.get("imageUrl") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  return run(
    () => maintenance.raiseMaintenanceRequest({ ...parsed.data, requestedById: me.id }),
    "Maintenance request submitted.",
  );
}

export async function approveMaintenanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(APPROVERS);

  const parsed = requestIdSchema.safeParse({ requestId: formData.get("requestId") });
  if (!parsed.success) return { error: "Invalid request." };

  return run(
    () => maintenance.approveMaintenance(parsed.data.requestId, me.id),
    "Maintenance approved.",
  );
}

export async function rejectMaintenanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(APPROVERS);

  const parsed = rejectMaintenanceSchema.safeParse({
    requestId: formData.get("requestId"),
    rejectReason: formData.get("rejectReason"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  return run(
    () => maintenance.rejectMaintenance(parsed.data.requestId, me.id, parsed.data.rejectReason),
    "Maintenance request rejected.",
  );
}

export async function assignTechnicianAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(APPROVERS);

  const parsed = assignTechnicianSchema.safeParse({
    requestId: formData.get("requestId"),
    technicianId: formData.get("technicianId"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  return run(
    () => maintenance.assignTechnician(parsed.data.requestId, me.id, parsed.data.technicianId),
    "Technician assigned.",
  );
}

export async function startMaintenanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAuth();

  const parsed = requestIdSchema.safeParse({ requestId: formData.get("requestId") });
  if (!parsed.success) return { error: "Invalid request." };

  return run(
    () => maintenance.startMaintenance(parsed.data.requestId, { id: me.id, role: me.role }),
    "Work started.",
  );
}

export async function resolveMaintenanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAuth();

  const parsed = resolveMaintenanceSchema.safeParse({
    requestId: formData.get("requestId"),
    resolutionNotes: formData.get("resolutionNotes"),
    repairCost: formData.get("repairCost") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  return run(
    () =>
      maintenance.resolveMaintenance(
        parsed.data.requestId,
        { resolutionNotes: parsed.data.resolutionNotes, repairCost: parsed.data.repairCost },
        { id: me.id, role: me.role },
      ),
    "Maintenance resolved.",
  );
}
