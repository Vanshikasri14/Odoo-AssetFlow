"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { resolveMaintenanceAction } from "../maintenance.actions";

export function ResolveDialog({ requestId }: { requestId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(resolveMaintenanceAction, undefined);

  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Resolve
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Resolve this request</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Resolution notes
            </label>
            <textarea
              name="resolutionNotes"
              rows={3}
              required
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="What was done to fix it?"
            />
            {state?.fieldErrors?.resolutionNotes && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.resolutionNotes[0]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Repair cost (optional)
            </label>
            <Input name="repairCost" type="number" step="0.01" min="0" placeholder="0.00" />
            {state?.fieldErrors?.repairCost && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.repairCost[0]}</p>
            )}
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Mark resolved"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
