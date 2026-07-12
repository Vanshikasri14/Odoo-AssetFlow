"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { rescheduleBookingAction } from "../booking.actions";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RescheduleDialog({
  bookingId,
  assetId,
  startDatetime,
  endDatetime,
}: {
  bookingId: number;
  assetId: number;
  startDatetime: Date;
  endDatetime: Date;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(rescheduleBookingAction, undefined);

  // Close on a successful submit — derived during render (not an effect), per
  // React's guidance for adjusting state in response to a prop/state change.
  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Reschedule
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Reschedule booking</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="assetId" value={assetId} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Start
              </label>
              <Input
                type="datetime-local"
                name="startDatetime"
                defaultValue={toLocalInputValue(startDatetime)}
                required
              />
              {state?.fieldErrors?.startDatetime && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.startDatetime[0]}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                End
              </label>
              <Input
                type="datetime-local"
                name="endDatetime"
                defaultValue={toLocalInputValue(endDatetime)}
                required
              />
              {state?.fieldErrors?.endDatetime && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.endDatetime[0]}</p>
              )}
            </div>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
