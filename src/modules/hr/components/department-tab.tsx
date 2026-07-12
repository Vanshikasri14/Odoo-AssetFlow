"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveDepartment, toggleDepartment } from "../hr.actions";
import { ActivePill, Banner, Field } from "./shared";

type Dept = {
  id: number;
  name: string;
  completeName: string | null;
  active: boolean;
  parentId: number | null;
  managerId: number | null;
  parent: { id: number; name: string } | null;
  manager: { id: number; name: string } | null;
  _count: { members: number; assets: number };
};

type Person = { id: number; name: string };

export function DepartmentTab({ departments, people }: { departments: Dept[]; people: Person[] }) {
  const [state, action, pending] = useActionState(saveDepartment, undefined);
  const [toggleState, toggleAction] = useActionState(toggleDepartment, undefined);
  const [editing, setEditing] = useState<Dept | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            Deactivating archives the record — assets and history are preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Banner ok={toggleState?.ok} error={toggleState?.error} />

          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead className="text-right">Assets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.id} className={d.active ? undefined : "opacity-50"}>
                  <TableCell>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{d.name}</div>
                    {d.parent && (
                      <div className="text-xs text-zinc-400">under {d.parent.name}</div>
                    )}
                  </TableCell>
                  <TableCell>{d.manager?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{d._count.members}</TableCell>
                  <TableCell className="text-right tabular-nums">{d._count.assets}</TableCell>
                  <TableCell>
                    <ActivePill active={d.active} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(d)}
                      >
                        Edit
                      </Button>
                      {/* A form, not an onClick: archiving can be REFUSED (a
                          department with people in it), and a fire-and-forget
                          call would drop that refusal on the floor. */}
                      <form action={toggleAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="active" value={String(!d.active)} />
                        <Button type="submit" variant="ghost" size="sm">
                          {d.active ? "Deactivate" : "Restore"}
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Edit ${editing.name}` : "New department"}</CardTitle>
          <CardDescription>A parent department builds the hierarchy.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4" key={editing?.id ?? "new"}>
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <Field label="Name" htmlFor="name" errors={state?.fieldErrors?.name}>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editing?.name}
                disabled={pending}
                placeholder="Engineering"
              />
            </Field>

            <Field
              label="Parent department"
              htmlFor="parentId"
              hint="Leave as None for a top-level department."
            >
              <Select
                id="parentId"
                name="parentId"
                defaultValue={editing?.parentId ?? "none"}
                disabled={pending}
              >
                <option value="none">None</option>
                {departments
                  .filter((d) => d.active && d.id !== editing?.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.completeName ?? d.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field
              label="Department Head"
              htmlFor="managerId"
              hint="Naming an Employee as Head also grants them the Department Head role."
            >
              <Select
                id="managerId"
                name="managerId"
                defaultValue={editing?.managerId ?? "none"}
                disabled={pending}
              >
                <option value="none">None</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Banner ok={state?.ok} error={state?.error} />

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : editing ? "Save changes" : "Create department"}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
