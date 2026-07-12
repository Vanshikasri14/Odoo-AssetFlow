"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { assertRole, ORG_ADMINS } from "@/lib/rbac";
import { DomainError, ForbiddenError } from "@/modules/core/errors";
import * as audit from "./audit.service";
import {
  createCycleSchema,
  cycleIdSchema,
  assignAuditorsSchema,
  markLineSchema,
  type ActionState,
} from "./audit.schema";

/** Marking a checklist line just needs a login — the service itself checks
 *  the actor is an assigned auditor (or admin). Cycle lifecycle actions
 *  (create/assign/start/close) are Admin-only, per the brief. */
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("You are not signed in.");
  return user;
}

async function run(fn: () => Promise<unknown>, path: string, ok: string): Promise<ActionState> {
  try {
    await fn();
    revalidatePath(path);
    revalidatePath("/audits");
    return { ok };
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
}

export async function createCycleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = createCycleSchema.safeParse({
    name: formData.get("name"),
    scopeDepartmentId: formData.get("scopeDepartmentId") ?? "",
    scopeLocation: formData.get("scopeLocation") ?? "",
    dateStart: formData.get("dateStart"),
    dateEnd: formData.get("dateEnd"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  return run(() => audit.createCycle(me.id, parsed.data), "/audits", "Audit cycle created.");
}

export async function assignAuditorsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = assignAuditorsSchema.safeParse({
    auditCycleId: formData.get("auditCycleId"),
    userIds: formData.getAll("userIds"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  return run(
    () => audit.assignAuditors(me.id, parsed.data.auditCycleId, parsed.data.userIds),
    `/audits/${parsed.data.auditCycleId}`,
    "Auditors updated.",
  );
}

export async function startCycleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = cycleIdSchema.safeParse({ auditCycleId: formData.get("auditCycleId") });
  if (!parsed.success) return { error: "Invalid request." };

  return run(
    () => audit.startCycle(me.id, parsed.data.auditCycleId),
    `/audits/${parsed.data.auditCycleId}`,
    "Audit cycle started.",
  );
}

export async function markLineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAuth();

  const parsed = markLineSchema.safeParse({
    lineId: formData.get("lineId"),
    result: formData.get("result"),
    observedCondition: formData.get("observedCondition") ?? "",
    observedLocation: formData.get("observedLocation") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const auditCycleId = String(formData.get("auditCycleId") ?? "");
  return run(
    () =>
      audit.markAuditLine(
        me.id,
        parsed.data.lineId,
        {
          result: parsed.data.result,
          observedCondition: parsed.data.observedCondition || null,
          observedLocation: parsed.data.observedLocation || null,
          notes: parsed.data.notes || null,
        },
        me.role === "admin",
      ),
    auditCycleId ? `/audits/${auditCycleId}` : "/audits",
    "Line updated.",
  );
}

export async function closeCycleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = cycleIdSchema.safeParse({ auditCycleId: formData.get("auditCycleId") });
  if (!parsed.success) return { error: "Invalid request." };

  return run(
    () => audit.closeCycle(me.id, parsed.data.auditCycleId),
    `/audits/${parsed.data.auditCycleId}`,
    "Audit cycle closed.",
  );
}
