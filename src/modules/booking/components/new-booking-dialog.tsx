"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createBookingAction } from "../booking.actions";

export function NewBookingDialog({ assetId, assetName }: { assetId: number; assetName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createBookingAction, undefined);

  // Close on a successful submit — derived during render (not an effect), per
  // React's guidance for adjusting state in response to a prop/state change.
  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New booking
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Book {assetName}</DialogTitle>
          <DialogDescription>
            Slots are half-open — a booking ending at 10:00 doesn&apos;t block one starting at
            10:00.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="assetId" value={assetId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Purpose
            </label>
            <Input name="name" placeholder="Sprint review" required />
            {state?.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Start
              </label>
              <Input type="datetime-local" name="startDatetime" required />
              {state?.fieldErrors?.startDatetime && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.startDatetime[0]}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                End
              </label>
              <Input type="datetime-local" name="endDatetime" required />
              {state?.fieldErrors?.endDatetime && (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.endDatetime[0]}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Notes (optional)
            </label>
            <Input name="notes" placeholder="Anything the next booker should know" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Booking…" : "Confirm booking"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
