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
import { PRIORITY_LABEL } from "../maintenance.model";
import { raiseMaintenanceAction } from "../maintenance.actions";

type Asset = { id: number; name: string; assetTag: string };

export function RaiseRequestDialog({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(raiseMaintenanceAction, undefined);

  const [handledOk, setHandledOk] = useState(state?.ok);
  if (state?.ok !== handledOk) {
    setHandledOk(state?.ok);
    if (state?.ok) setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Raise request
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Raise a maintenance request</DialogTitle>
          <DialogDescription>
            Submitting this doesn&apos;t change the asset&apos;s status — it only moves once an
            approver signs off.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Asset
            </label>
            <Select name="assetId" required defaultValue="">
              <option value="" disabled>
                Select an asset
              </option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} — {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Title
            </label>
            <Input name="name" placeholder="Screen flickering" required />
            {state?.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Priority
            </label>
            <Select name="priority" required defaultValue="medium">
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Describe the issue
            </label>
            <textarea
              name="description"
              rows={3}
              required
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="What's wrong, and since when?"
            />
            {state?.fieldErrors?.description && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.description[0]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Photo URL (optional)
            </label>
            <Input name="imageUrl" placeholder="https://…" />
            {state?.fieldErrors?.imageUrl && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.imageUrl[0]}</p>
            )}
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
