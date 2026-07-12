"use client";

import { useActionState } from "react";
import type { UserRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { assignDept, promote, resetUserPassword, toggleEmployee } from "../hr.actions";
import { ActivePill, Banner } from "./shared";

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

const ROLE_STYLE: Partial<Record<UserRole, string>> = {
  asset_manager: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-500/30",
  dept_head: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
};

/**
 * The roles an Admin may grant. `admin` is deliberately absent — see
 * promoteUser() in hr.service.ts. Minting administrators from a form is how one
 * compromised session becomes a permanent one.
 */
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
  const [resetState, resetAction, resetting] = useActionState(resetUserPassword, undefined);

  // The reset banner carries a one-time temporary password, so it wins: it must
  // not be knocked off screen by a later "Department updated."
  const banner = resetState ?? promoteState ?? deptState ?? activeState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee directory</CardTitle>
        <CardDescription>
          The only place in AssetFlow where a role can be granted. Signup always creates an Employee.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Banner ok={banner?.ok} error={banner?.error} />

        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Grant role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => {
              const isMe = e.id === meId;
              const isAdmin = e.role === "admin";
              // Both rules are enforced server-side in hr.service.ts; hiding the
              // controls here just stops people trying.
              const locked = isMe || isAdmin;

              return (
                <TableRow key={e.id} className={e.active ? undefined : "opacity-50"}>
                  <TableCell>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {e.name}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-zinc-400">(you)</span>}
                    </div>
                    <div className="text-xs text-zinc-400">{e.login}</div>
                  </TableCell>

                  <TableCell>
                    <form action={deptAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={e.id} />
                      <Select
                        name="departmentId"
                        defaultValue={e.departmentId ?? "none"}
                        className="h-8 w-36 text-xs"
                      >
                        <option value="none">—</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" variant="outline" size="sm">
                        Set
                      </Button>
                    </form>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={isAdmin ? "default" : "secondary"}
                      className={ROLE_STYLE[e.role]}
                    >
                      {ROLE_LABEL[e.role]}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {locked ? (
                      <span className="text-xs text-zinc-400">
                        {isMe ? "Cannot change your own role" : "Protected"}
                      </span>
                    ) : (
                      <form action={promoteAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="userId" value={e.id} />
                        <Select
                          name="role"
                          defaultValue={e.role}
                          disabled={promoting}
                          className="h-8 w-40 text-xs"
                        >
                          {GRANTABLE.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="outline" size="sm" disabled={promoting}>
                          Apply
                        </Button>
                      </form>
                    )}
                  </TableCell>

                  <TableCell>
                    <ActivePill active={e.active} />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      {/* The admin half of the forgot-password flow: the user asks,
                          the Admin resets, and the temporary password is shown
                          once, here, to nobody else. */}
                      {!isMe && e.active && (
                        <form action={resetAction}>
                          <input type="hidden" name="userId" value={e.id} />
                          <Button type="submit" variant="ghost" size="sm" disabled={resetting}>
                            Reset password
                          </Button>
                        </form>
                      )}

                      {!isMe && (
                        <form action={activeAction}>
                          <input type="hidden" name="userId" value={e.id} />
                          <input type="hidden" name="active" value={String(!e.active)} />
                          <Button type="submit" variant="ghost" size="sm">
                            {e.active ? "Deactivate" : "Restore"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <p className="mt-4 border-t border-zinc-100 pt-4 text-xs leading-relaxed text-zinc-400 dark:border-zinc-800">
          Admin is not grantable from this screen. Minting new administrators through the UI is how
          one compromised session becomes a permanent one — admins are seeded deliberately.
        </p>
      </CardContent>
    </Card>
  );
}
