import "server-only";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { ForbiddenError } from "@/modules/core/errors";

/**
 * Role-based access control.
 *
 * The security posture the brief demands, restated: **a role is something the
 * Admin grants you, never something you claim.** Signup is hardcoded to
 * `employee` (see modules/auth/auth.actions.ts) and `role` is not an accepted
 * input on any form except the Admin's Employee Directory promotion action.
 *
 * Guards live on the SERVER, in the action/service layer. Hiding a button in
 * the UI is a courtesy to the user, not a security control — every mutating
 * action re-checks for itself.
 */

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  asset_manager: "Asset Manager",
  dept_head: "Department Head",
  employee: "Employee",
};

/** Who may approve transfers, maintenance and audit outcomes. */
export const APPROVERS: UserRole[] = ["admin", "asset_manager", "dept_head"];

/** Who may register assets and run the asset registry. */
export const ASSET_WRITERS: UserRole[] = ["admin", "asset_manager"];

/** Who may touch org master data (departments, categories, roles). */
export const ORG_ADMINS: UserRole[] = ["admin"];

/** For page components: bounce anonymous visitors to the login screen. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For page components: bounce users who lack the role. */
export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard?denied=1");
  return user;
}

/**
 * For server ACTIONS: throw rather than redirect, so the form can render the
 * error inline instead of navigating away mid-submit.
 */
export async function assertRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("You are not signed in.");
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(
      `This action requires: ${roles.map((r) => ROLE_LABEL[r]).join(" or ")}.`,
    );
  }
  return user;
}

/** Pure predicates — safe to call from client components for showing/hiding UI. */
export const can = {
  manageOrg: (u: SessionUser) => ORG_ADMINS.includes(u.role),
  writeAssets: (u: SessionUser) => ASSET_WRITERS.includes(u.role),
  approve: (u: SessionUser) => APPROVERS.includes(u.role),
  viewAllAnalytics: (u: SessionUser) => u.role === "admin" || u.role === "asset_manager",
};
