"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { rejectMaintenanceAction } from "../maintenance.actions";

export function RejectDialog({ requestId }: { requestId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(rejectMaintenanceAction, undefined);

  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reject
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Reject this request</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Reason
            </label>
            <textarea
              name="rejectReason"
              rows={3}
              required
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="Why isn't this approved?"
            />
            {state?.fieldErrors?.rejectReason && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.rejectReason[0]}</p>
            )}
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Rejecting…" : "Reject request"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
