"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveCategory, toggleCategory } from "../hr.actions";
import { ActivePill, Banner, Field } from "./shared";

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
      <Card>
        <CardHeader>
          <CardTitle>Asset categories</CardTitle>
          <CardDescription>
            Categories drive the registration form and the reports breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Banner ok={toggleState?.ok} error={toggleState?.error} />

          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead className="text-right">Assets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id} className={c.active ? undefined : "opacity-50"}>
                  <TableCell>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{c.name}</div>
                    {c.description && (
                      <div className="max-w-xs truncate text-xs text-zinc-400">{c.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.code ? (
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {c.code}
                      </code>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{c.warrantyMonths ? `${c.warrantyMonths} months` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c._count.assets}</TableCell>
                  <TableCell>
                    <ActivePill active={c.active} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(c)}>
                        Edit
                      </Button>
                      <form action={toggleAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={String(!c.active)} />
                        <Button type="submit" variant="ghost" size="sm">
                          {c.active ? "Deactivate" : "Restore"}
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
          <CardTitle>{editing ? `Edit ${editing.name}` : "New category"}</CardTitle>
          <CardDescription>
            Warranty is the category-specific field called for in the brief.
          </CardDescription>
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
                placeholder="Electronics"
              />
            </Field>

            <Field
              label="Code"
              htmlFor="code"
              errors={state?.fieldErrors?.code}
              hint="Short prefix, e.g. ELEC."
            >
              <Input
                id="code"
                name="code"
                defaultValue={editing?.code ?? ""}
                disabled={pending}
                placeholder="ELEC"
                maxLength={6}
              />
            </Field>

            <Field
              label="Warranty (months)"
              htmlFor="warrantyMonths"
              errors={state?.fieldErrors?.warrantyMonths}
              hint="Blank for categories without one, like Furniture."
            >
              <Input
                id="warrantyMonths"
                name="warrantyMonths"
                type="number"
                min={0}
                max={600}
                defaultValue={editing?.warrantyMonths ?? ""}
                disabled={pending}
                placeholder="24"
              />
            </Field>

            <Field label="Description" htmlFor="description">
              <Input
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
                disabled={pending}
                placeholder="Laptops, phones, displays"
              />
            </Field>

            <Banner ok={state?.ok} error={state?.error} />

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : editing ? "Save changes" : "Create category"}
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
