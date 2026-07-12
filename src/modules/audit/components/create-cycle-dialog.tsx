"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createCycleAction } from "../audit.actions";

type Department = { id: number; name: string };

export function CreateCycleDialog({ departments }: { departments: Department[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCycleAction, undefined);

  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New cycle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Create an audit cycle</DialogTitle>
          <DialogDescription>
            Scope by department and/or location — leave both blank to cover the whole
            organisation.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <Input name="name" placeholder="Q3 IT equipment audit" required />
            {state?.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Department (optional)
              </label>
              <Select name="scopeDepartmentId" defaultValue="">
                <option value="">Whole organisation</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Location (optional)
              </label>
              <Input name="scopeLocation" placeholder="Bengaluru HQ / Floor 2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Start date
              </label>
              <Input type="date" name="dateStart" required />
              {state?.fieldErrors?.dateStart && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.dateStart[0]}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                End date
              </label>
              <Input type="date" name="dateEnd" required />
              {state?.fieldErrors?.dateEnd && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.dateEnd[0]}</p>
              )}
            </div>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create cycle"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
