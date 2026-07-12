"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { assignTechnicianAction } from "../maintenance.actions";

type Technician = { id: number; name: string };

export function AssignTechnicianDialog({
  requestId,
  technicians,
}: {
  requestId: number;
  technicians: Technician[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(assignTechnicianAction, undefined);

  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Assign technician
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Assign a technician</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Technician
            </label>
            <Select name="technicianId" required defaultValue="">
              <option value="" disabled>
                Select a technician
              </option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {state?.fieldErrors?.technicianId && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.technicianId[0]}</p>
            )}
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
