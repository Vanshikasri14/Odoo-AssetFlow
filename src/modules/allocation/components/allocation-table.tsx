"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AssetCondition } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CONDITION_LABEL } from "@/modules/asset/asset.schema";
import { Banner, Field } from "@/modules/hr/components/shared";
import { returnAsset } from "../allocation.actions";

type Allocation = {
  id: number;
  allocatedDate: Date;
  expectedReturnDate: Date | null;
  returnedDate: Date | null;
  checkinCondition: AssetCondition | null;
  checkinNotes: string | null;
  asset: { id: number; assetTag: string; name: string };
  holderUser: { id: number; name: string } | null;
  holderDept: { id: number; name: string } | null;
  allocatedBy: { id: number; name: string };
};

function date(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d));
}

/** Days overdue, for the "8 days late" copy — vaguer than a date, but louder. */
function daysLate(due: Date) {
  return Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000);
}

export function AllocationTable({
  allocations,
  scope,
  canReturn,
}: {
  allocations: Allocation[];
  scope: "active" | "overdue" | "returned";
  canReturn: boolean;
}) {
  const [returning, setReturning] = useState<Allocation | null>(null);
  const [state, action, pending] = useActionState(returnAsset, undefined);

  if (allocations.length === 0) {
    return (
      <EmptyState
        title={
          scope === "overdue"
            ? "Nothing is overdue"
            : scope === "returned"
              ? "No returns yet"
              : "Nothing is allocated"
        }
        description={
          scope === "overdue"
            ? "Every asset that's out is still within its expected return date."
            : "Assets that are issued will appear here."
        }
      />
    );
  }

  return (
    <>
      <Banner ok={state?.ok} error={state?.error} />

      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Held by</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>{scope === "returned" ? "Returned" : "Due back"}</TableHead>
            {scope === "returned" && <TableHead>Condition</TableHead>}
            {canReturn && scope !== "returned" && <TableHead />}
          </TableRow>
        </TableHeader>

        <TableBody>
          {allocations.map((a) => {
            const overdue =
              a.returnedDate === null &&
              a.expectedReturnDate !== null &&
              new Date(a.expectedReturnDate) < new Date();

            return (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/assets/${a.asset.id}`} className="group">
                    <div className="font-mono text-xs text-zinc-500">{a.asset.assetTag}</div>
                    <div className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-50">
                      {a.asset.name}
                    </div>
                  </Link>
                </TableCell>

                <TableCell>
                  <div className="text-zinc-900 dark:text-zinc-50">
                    {a.holderUser?.name ?? a.holderDept?.name}
                  </div>
                  {a.holderDept && !a.holderUser && (
                    <div className="text-xs text-zinc-400">Department</div>
                  )}
                </TableCell>

                <TableCell className="text-zinc-500 dark:text-zinc-400">
                  {date(a.allocatedDate)}
                </TableCell>

                <TableCell>
                  {scope === "returned" ? (
                    <span className="text-zinc-500 dark:text-zinc-400">{date(a.returnedDate)}</span>
                  ) : a.expectedReturnDate ? (
                    overdue ? (
                      <Badge variant="destructive">
                        {daysLate(a.expectedReturnDate)} days late
                      </Badge>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {date(a.expectedReturnDate)}
                      </span>
                    )
                  ) : (
                    <span className="text-zinc-400">No date set</span>
                  )}
                </TableCell>

                {scope === "returned" && (
                  <TableCell>
                    {a.checkinCondition ? (
                      <div>
                        <Badge variant="secondary">{CONDITION_LABEL[a.checkinCondition]}</Badge>
                        {a.checkinNotes && (
                          <div className="mt-0.5 max-w-xs truncate text-xs text-zinc-400">
                            {a.checkinNotes}
                          </div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}

                {canReturn && scope !== "returned" && (
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setReturning(a)}
                      >
                        Return
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Check-in. The brief asks for condition notes captured on return — and
          the condition observed here becomes the asset's condition. */}
      {returning && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Return {returning.asset.assetTag}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {returning.asset.name} — from{" "}
              {returning.holderUser?.name ?? returning.holderDept?.name}
            </p>

            <form
              action={(fd) => {
                action(fd);
                setReturning(null);
              }}
              className="mt-4 space-y-4"
            >
              <input type="hidden" name="allocationId" value={returning.id} />

              <Field
                label="Condition on check-in"
                htmlFor="checkinCondition"
                hint="This becomes the asset's recorded condition."
              >
                <Select
                  id="checkinCondition"
                  name="checkinCondition"
                  required
                  defaultValue="good"
                  disabled={pending}
                >
                  {Object.values(AssetCondition).map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABEL[c]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Check-in notes" htmlFor="checkinNotes">
                <Input
                  id="checkinNotes"
                  name="checkinNotes"
                  disabled={pending}
                  placeholder="Any damage, missing accessories…"
                />
              </Field>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setReturning(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Confirm return
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
