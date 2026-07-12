"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Banner, Field } from "@/modules/hr/components/shared";
import { allocate, requestTransfer } from "../allocation.actions";

type Asset = { id: number; assetTag: string; name: string };
type Person = { id: number; name: string; department: { name: string } | null };
type Dept = { id: number; name: string };

export function AllocateForm({
  assets,
  users,
  departments,
  allAssets,
}: {
  /** Only assets that can actually be issued right now. */
  assets: Asset[];
  users: Person[];
  departments: Dept[];
  /** Every asset — the conflict path needs to allocate against a HELD one. */
  allAssets: Asset[];
}) {
  const [state, action, pending] = useActionState(allocate, undefined);

  // Lets the demo pick an already-held asset on purpose, to trigger the conflict.
  const [showAll, setShowAll] = useState(false);
  const options = showAll ? allAssets : assets;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Allocate an asset</CardTitle>
          <CardDescription>
            An asset can be held by one person or one department at a time.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={action} className="space-y-4">
            <Field label="Asset" htmlFor="assetId" errors={state?.fieldErrors?.assetId}>
              <Select id="assetId" name="assetId" required disabled={pending} defaultValue="">
                <option value="" disabled>
                  Choose an asset…
                </option>
                {options.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetTag} — {a.name}
                  </option>
                ))}
              </Select>
              <label className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                  className="h-3 w-3 rounded border-zinc-300"
                />
                Include assets that are already held
              </label>
            </Field>

            <Field label="Allocate to" htmlFor="holder" errors={state?.fieldErrors?.holder}>
              <Select id="holder" name="holder" required disabled={pending} defaultValue="">
                <option value="" disabled>
                  Choose a person or department…
                </option>
                <optgroup label="People">
                  {users.map((u) => (
                    <option key={`u${u.id}`} value={`user:${u.id}`}>
                      {u.name}
                      {u.department ? ` — ${u.department.name}` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Departments">
                  {departments.map((d) => (
                    <option key={`d${d.id}`} value={`dept:${d.id}`}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>

            <Field
              label="Expected return date"
              htmlFor="expectedReturnDate"
              hint="Optional. Past this date the allocation is flagged overdue."
            >
              <Input
                id="expectedReturnDate"
                name="expectedReturnDate"
                type="date"
                disabled={pending}
              />
            </Field>

            <Field label="Notes" htmlFor="notes">
              <Input id="notes" name="notes" disabled={pending} placeholder="Optional" />
            </Field>

            {/* Success and non-conflict errors. The conflict gets its own panel. */}
            {!state?.conflict && <Banner ok={state?.ok} error={state?.error} />}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Allocating…" : "Allocate asset"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/*
        ⭐ THE CONFLICT PANEL — the brief's requirement, in full.
        Blocking alone isn't enough. The system must say WHO has it, and offer
        the way forward. A dead-end error message would be a failed requirement.
      */}
      {state?.conflict && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  {state.conflict.assetTag} is currently held by {state.conflict.holderName}.
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  It can&apos;t be allocated to someone else while they have it. You can request a
                  transfer instead — an Asset Manager will decide.
                </p>

                <TransferRequestForm
                  assetId={state.conflict.assetId}
                  assetTag={state.conflict.assetTag}
                  holderName={state.conflict.holderName}
                  users={users.filter((u) => u.id !== state.conflict!.holderId)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** The escape hatch the conflict panel offers. */
function TransferRequestForm({
  assetId,
  assetTag,
  holderName,
  users,
}: {
  assetId: number;
  assetTag: string;
  holderName: string;
  users: Person[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestTransfer, undefined);

  if (state?.ok) {
    return (
      <p className="mt-3 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        {state.ok}
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 border-amber-400 bg-white hover:bg-amber-100 dark:bg-transparent"
        onClick={() => setOpen(true)}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Request transfer
      </Button>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="assetId" value={assetId} />

      <Field label="Transfer to" htmlFor="toUserId" errors={state?.fieldErrors?.toUserId}>
        <Select id="toUserId" name="toUserId" required disabled={pending} defaultValue="">
          <option value="" disabled>
            Who should receive it?
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Reason"
        htmlFor="reason"
        errors={state?.fieldErrors?.reason}
        hint={`${holderName} and the approver will both see this.`}
      >
        <Input
          id="reason"
          name="reason"
          required
          disabled={pending}
          placeholder={`Why is ${assetTag} needed?`}
        />
      </Field>

      <Banner error={state?.error} />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
