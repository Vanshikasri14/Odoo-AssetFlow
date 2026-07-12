"use client";

import { useActionState } from "react";
import type { UserRole } from "@prisma/client";
import { assignDept, promote, toggleEmployee } from "../hr.actions";
import { Banner, BTN_GHOST, Card, INPUT, Pill } from "./ui";

type Employee = {
  id: number;
  name: string;
  login: string;
  role: UserRole;
  jobTitle: string | null;
  active: boolean;
  departmentId: number | null;
  department: { id: number; name: string } | null;
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  asset_manager: "Asset Manager",
  dept_head: "Department Head",
  employee: "Employee",
};

const ROLE_STYLE: Record<UserRole, string> = {
  admin: "bg-slate-900 text-white ring-slate-900",
  asset_manager: "bg-blue-50 text-blue-700 ring-blue-600/20",
  dept_head: "bg-violet-50 text-violet-700 ring-violet-600/20",
  employee: "bg-slate-100 text-slate-600 ring-slate-400/20",
};

/** Roles an Admin may grant. `admin` is absent on purpose — see promoteUser(). */
const GRANTABLE: UserRole[] = ["employee", "dept_head", "asset_manager"];

export function EmployeeTab({
  employees,
  departments,
  meId,
}: {
  employees: Employee[];
  departments: { id: number; name: string }[];
  meId: number;
}) {
  const [promoteState, promoteAction, promoting] = useActionState(promote, undefined);
  const [deptState, deptAction] = useActionState(assignDept, undefined);
  const [activeState, activeAction] = useActionState(toggleEmployee, undefined);

  const banner = promoteState ?? deptState ?? activeState;

  return (
    <Card
      title="Employee directory"
      subtitle="This is the only place in AssetFlow where a role can be granted. Signup always creates an Employee."
    >
      <div className="mb-4">
        <Banner ok={banner?.ok} error={banner?.error} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-medium">Employee</th>
              <th className="pb-2 font-medium">Department</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Grant role</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((e) => {
              const isMe = e.id === meId;
              const isAdmin = e.role === "admin";
              // You cannot change your own role, and you cannot touch an admin's.
              // Both rules are enforced in hr.service.ts — this just hides the
              // controls so nobody tries.
              const locked = isMe || isAdmin;

              return (
                <tr key={e.id} className={e.active ? "" : "opacity-50"}>
                  <td className="py-3">
                    <div className="font-medium text-slate-900">
                      {e.name}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
                    </div>
                    <div className="text-xs text-slate-400">{e.login}</div>
                  </td>

                  <td className="py-3">
                    <form action={deptAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={e.id} />
                      <select
                        name="departmentId"
                        defaultValue={e.departmentId ?? "none"}
                        className={`${INPUT} !w-40 !py-1 text-xs`}
                      >
                        <option value="none">—</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <button type="submit" className={BTN_GHOST}>Set</button>
                    </form>
                  </td>

                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_STYLE[e.role]}`}
                    >
                      {ROLE_LABEL[e.role]}
                    </span>
                  </td>

                  <td className="py-3">
                    {locked ? (
                      <span className="text-xs text-slate-400">
                        {isMe ? "Cannot change your own role" : "Protected"}
                      </span>
                    ) : (
                      <form action={promoteAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="userId" value={e.id} />
                        <select
                          name="role"
                          defaultValue={e.role}
                          disabled={promoting}
                          className={`${INPUT} !w-40 !py-1 text-xs`}
                        >
                          {GRANTABLE.map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                        <button type="submit" disabled={promoting} className={BTN_GHOST}>
                          Apply
                        </button>
                      </form>
                    )}
                  </td>

                  <td className="py-3"><Pill active={e.active} /></td>

                  <td className="py-3 text-right">
                    {!isMe && (
                      <form action={activeAction}>
                        <input type="hidden" name="userId" value={e.id} />
                        <input type="hidden" name="active" value={String(!e.active)} />
                        <button type="submit" className={BTN_GHOST}>
                          {e.active ? "Deactivate" : "Restore"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">
        Admin is not grantable from this screen. Minting new administrators through the UI is how
        one compromised session becomes a permanent one — admins are seeded deliberately.
      </p>
    </Card>
  );
}
