"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { closeCycleAction } from "../audit.actions";

export function CloseCycleDialog({
  auditCycleId,
  discrepancyCount,
  pendingCount,
}: {
  auditCycleId: number;
  discrepancyCount: number;
  pendingCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(closeCycleAction, undefined);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Close cycle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Close this audit cycle?</DialogTitle>
          <DialogDescription>
            This locks the cycle. Every line marked Missing sends that asset to Lost; every line
            marked Damaged patches its condition. Both notify the relevant approvers.
            {pendingCount > 0 &&
              ` ${pendingCount} line${pendingCount === 1 ? " is" : "s are"} still unmarked.`}
            {discrepancyCount > 0 &&
              ` ${discrepancyCount} discrepanc${discrepancyCount === 1 ? "y" : "ies"} will be applied.`}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="auditCycleId" value={auditCycleId} />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Closing…" : "Close cycle"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
