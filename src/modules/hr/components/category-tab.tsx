"use client";

import { useActionState, useState } from "react";
import { saveCategory, toggleCategory } from "../hr.actions";
import { Banner, BTN, BTN_GHOST, Card, Field, INPUT, Pill } from "./ui";

type Category = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  warrantyMonths: number | null;
  active: boolean;
  _count: { assets: number };
};

export function CategoryTab({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  const [toggleState, toggleAction] = useActionState(toggleCategory, undefined);
  const [editing, setEditing] = useState<Category | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card title="Asset categories" subtitle="Categories drive the registration form and the reports breakdown.">
        {(toggleState?.ok || toggleState?.error) && (
          <div className="mb-4">
            <Banner ok={toggleState.ok} error={toggleState.error} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Code</th>
                <th className="pb-2 font-medium">Warranty</th>
                <th className="pb-2 text-right font-medium">Assets</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                  <td className="py-2.5">
                    <div className="font-medium text-slate-900">{c.name}</div>
                    {c.description && (
                      <div className="max-w-xs truncate text-xs text-slate-400">{c.description}</div>
                    )}
                  </td>
                  <td className="py-2.5">
                    {c.code ? (
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                        {c.code}
                      </code>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-slate-600">
                    {c.warrantyMonths ? `${c.warrantyMonths} months` : "—"}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">{c._count.assets}</td>
                  <td className="py-2.5"><Pill active={c.active} /></td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" className={BTN_GHOST} onClick={() => setEditing(c)}>
                        Edit
                      </button>
                      <form action={toggleAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={String(!c.active)} />
                        <button type="submit" className={BTN_GHOST}>
                          {c.active ? "Deactivate" : "Restore"}
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
        title={editing ? `Edit ${editing.name}` : "New category"}
        subtitle="Warranty is the category-specific field from the brief."
      >
        <form action={action} className="space-y-4" key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <Field label="Name" htmlFor="name" errors={state?.fieldErrors?.name}>
            <input
              id="name" name="name" required defaultValue={editing?.name}
              disabled={pending} className={INPUT} placeholder="Electronics"
            />
          </Field>

          <Field label="Code" htmlFor="code" errors={state?.fieldErrors?.code} hint="Short prefix, e.g. ELEC.">
            <input
              id="code" name="code" defaultValue={editing?.code ?? ""}
              disabled={pending} className={INPUT} placeholder="ELEC" maxLength={6}
            />
          </Field>

          <Field
            label="Warranty (months)"
            htmlFor="warrantyMonths"
            errors={state?.fieldErrors?.warrantyMonths}
            hint="Leave blank for categories without a warranty, like Furniture."
          >
            <input
              id="warrantyMonths" name="warrantyMonths" type="number" min={0} max={600}
              defaultValue={editing?.warrantyMonths ?? ""} disabled={pending}
              className={INPUT} placeholder="24"
            />
          </Field>

          <Field label="Description" htmlFor="description">
            <input
              id="description" name="description" defaultValue={editing?.description ?? ""}
              disabled={pending} className={INPUT} placeholder="Laptops, phones, displays"
            />
          </Field>

          <Banner ok={state?.ok} error={state?.error} />

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={BTN}>
              {pending ? "Saving…" : editing ? "Save changes" : "Create category"}
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
