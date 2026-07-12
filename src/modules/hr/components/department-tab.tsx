"use client";

import { useActionState, useState } from "react";
import { saveDepartment, toggleDepartment } from "../hr.actions";
import { Banner, BTN, BTN_GHOST, Card, Field, INPUT, Pill } from "./ui";

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
      <Card title="Departments" subtitle="Deactivating archives the record — history and assets are preserved.">
        {(toggleState?.ok || toggleState?.error) && (
          <div className="mb-4">
            <Banner ok={toggleState.ok} error={toggleState.error} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-medium">Department</th>
                <th className="pb-2 font-medium">Head</th>
                <th className="pb-2 text-right font-medium">People</th>
                <th className="pb-2 text-right font-medium">Assets</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d.id} className={d.active ? "" : "opacity-50"}>
                  <td className="py-2.5">
                    <div className="font-medium text-slate-900">{d.name}</div>
                    {d.parent && (
                      <div className="text-xs text-slate-400">under {d.parent.name}</div>
                    )}
                  </td>
                  <td className="py-2.5 text-slate-600">{d.manager?.name ?? "—"}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">{d._count.members}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">{d._count.assets}</td>
                  <td className="py-2.5"><Pill active={d.active} /></td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" className={BTN_GHOST} onClick={() => setEditing(d)}>
                        Edit
                      </button>
                      <form action={toggleAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="active" value={String(!d.active)} />
                        <button type="submit" className={BTN_GHOST}>
                          {d.active ? "Deactivate" : "Restore"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title={editing ? `Edit ${editing.name}` : "New department"}
        subtitle="A parent department builds the hierarchy."
      >
        <form action={action} className="space-y-4" key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <Field label="Name" htmlFor="name" errors={state?.fieldErrors?.name}>
            <input
              id="name"
              name="name"
              required
              defaultValue={editing?.name}
              disabled={pending}
              className={INPUT}
              placeholder="Engineering"
            />
          </Field>

          <Field label="Parent department" htmlFor="parentId" hint="Optional — leave as None for a top-level department.">
            <select
              id="parentId"
              name="parentId"
              defaultValue={editing?.parentId ?? "none"}
              disabled={pending}
              className={INPUT}
            >
              <option value="none">None</option>
              {departments
                .filter((d) => d.active && d.id !== editing?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.completeName ?? d.name}</option>
                ))}
            </select>
          </Field>

          <Field
            label="Department Head"
            htmlFor="managerId"
            hint="Promoting an Employee to Head here also grants them the Department Head role."
          >
            <select
              id="managerId"
              name="managerId"
              defaultValue={editing?.managerId ?? "none"}
              disabled={pending}
              className={INPUT}
            >
              <option value="none">None</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          <Banner ok={state?.ok} error={state?.error} />

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={BTN}>
              {pending ? "Saving…" : editing ? "Save changes" : "Create department"}
            </button>
            {editing && (
              <button type="button" className={BTN_GHOST} onClick={() => setEditing(null)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
