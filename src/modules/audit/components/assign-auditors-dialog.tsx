"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { assignAuditorsAction } from "../audit.actions";

type Employee = { id: number; name: string };

export function AssignAuditorsDialog({
  auditCycleId,
  employees,
  assignedIds,
}: {
  auditCycleId: number;
  employees: Employee[];
  assignedIds: number[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(assignAuditorsAction, undefined);

  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  const assigned = new Set(assignedIds);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Assign auditors
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Assign auditors</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="auditCycleId" value={auditCycleId} />
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
            {employees.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  name="userIds"
                  value={e.id}
                  defaultChecked={assigned.has(e.id)}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                />
                {e.name}
              </label>
            ))}
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save auditors"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
