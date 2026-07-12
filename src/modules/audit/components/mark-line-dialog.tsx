"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { markLineAction } from "../audit.actions";

const CONDITIONS = ["new", "good", "fair", "poor", "damaged"] as const;

export function MarkLineDialog({
  lineId,
  auditCycleId,
  assetLabel,
  currentLocation,
}: {
  lineId: number;
  auditCycleId: number;
  assetLabel: string;
  currentLocation: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(markLineAction, undefined);

  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Mark
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{assetLabel}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="lineId" value={lineId} />
          <input type="hidden" name="auditCycleId" value={auditCycleId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Result
            </label>
            <Select name="result" required defaultValue="verified">
              <option value="verified">Verified</option>
              <option value="missing">Missing</option>
              <option value="damaged">Damaged</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Observed condition
              </label>
              <Select name="observedCondition" defaultValue="">
                <option value="">—</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Observed location
              </label>
              <Input name="observedLocation" defaultValue={currentLocation ?? ""} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="Anything the report should mention"
            />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
