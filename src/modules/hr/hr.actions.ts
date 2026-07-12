"use server";

import { revalidatePath } from "next/cache";
import { assertRole, ORG_ADMINS } from "@/lib/rbac";
import { DomainError } from "@/modules/core/errors";
import * as hr from "./hr.service";
import {
  assignDepartmentSchema,
  categorySchema,
  departmentSchema,
  promoteSchema,
  toggleActiveSchema,
  type ActionState,
} from "./hr.schema";

/**
 * Every action here is guarded by `assertRole(ORG_ADMINS)` — i.e. Admin only.
 * The guard is on the SERVER. The UI also hides these controls from non-admins,
 * but that is a courtesy, not a control: hiding a button does not stop anyone
 * from calling the action.
 */

/** Turn a thrown DomainError into form state; let real bugs bubble up as 500s. */
async function run(fn: () => Promise<unknown>, ok: string): Promise<ActionState> {
  try {
    await fn();
    revalidatePath("/organization");
    return { ok };
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
}

export async function saveDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = departmentSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    parentId: formData.get("parentId") ?? "",
    managerId: formData.get("managerId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  return run(
    () => hr.upsertDepartment(me.id, parsed.data),
    parsed.data.id ? "Department updated." : "Department created.",
  );
}

/**
 * Form-based rather than a bare `onClick={() => toggle(id)}` on purpose: these
 * can FAIL (you may not archive a department that still has people in it), and a
 * fire-and-forget call from an event handler would drop that error on the floor.
 * Going through useActionState means the refusal is shown to the user.
 */
export async function toggleDepartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const id = Number(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid request." };

  return run(
    () => hr.setDepartmentActive(me.id, id, active),
    active ? "Department reactivated." : "Department deactivated.",
  );
}

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    code: formData.get("code") ?? "",
    description: formData.get("description") ?? "",
    warrantyMonths: formData.get("warrantyMonths") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  return run(
    () => hr.upsertCategory(me.id, parsed.data),
    parsed.data.id ? "Category updated." : "Category created.",
  );
}

export async function toggleCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const id = Number(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid request." };

  return run(
    () => hr.setCategoryActive(me.id, id, active),
    active ? "Category reactivated." : "Category deactivated.",
  );
}

/**
 * ⭐ Role promotion. Admin only, and the single entry point to `res_users.role`.
 */
export async function promote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = promoteSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Pick a valid role." };

  return run(
    () => hr.promoteUser(me.id, parsed.data.userId, parsed.data.role),
    "Role updated.",
  );
}

export async function assignDept(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = assignDepartmentSchema.safeParse({
    userId: formData.get("userId"),
    departmentId: formData.get("departmentId") ?? "",
  });
  if (!parsed.success) return { error: "Pick a valid department." };

  return run(
    () => hr.assignDepartment(me.id, parsed.data.userId, parsed.data.departmentId),
    "Department updated.",
  );
}

export async function toggleEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await assertRole(ORG_ADMINS);

  const parsed = toggleActiveSchema.safeParse({
    userId: formData.get("userId"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  return run(
    () => hr.setUserActive(me.id, parsed.data.userId, parsed.data.active),
    parsed.data.active ? "Employee reactivated." : "Employee deactivated.",
  );
}
