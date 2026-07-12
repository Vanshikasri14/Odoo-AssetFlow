"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TransferState } from "@prisma/client";
import { Badge, statusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banner } from "@/modules/hr/components/shared";
import { approveTransfer, rejectTransfer } from "../allocation.actions";

type Transfer = {
  id: number;
  state: TransferState;
  reason: string | null;
  rejectReason: string | null;
  createDate: Date;
  asset: { id: number; assetTag: string; name: string };
  fromUser: { id: number; name: string } | null;
  toUser: { id: number; name: string };
  requestedBy: { id: number; name: string };
};

const STATE_STYLE: Record<TransferState, string> = {
  pending: statusPill("amber"),
  approved: statusPill("emerald"),
  rejected: statusPill("red"),
  cancelled: statusPill("zinc"),
};

function date(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d));
}

export function TransferTable({
  transfers,
  canApprove,
}: {
  transfers: Transfer[];
  canApprove: boolean;
}) {
  const [approveState, approveAction, approving] = useActionState(approveTransfer, undefined);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectTransfer, undefined);

  const banner = approveState ?? rejectState;

  if (transfers.length === 0) {
    return (
      <EmptyState
        title="No transfer requests"
        description="When someone asks for an asset another person holds, it appears here for approval."
      />
    );
  }

  return (
    <>
      <Banner ok={banner?.ok} error={banner?.error} />

      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Movement</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            {canApprove && <TableHead />}
          </TableRow>
        </TableHeader>

        <TableBody>
          {transfers.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <Link href={`/assets/${t.asset.id}`} className="group">
                  <div className="font-mono text-xs text-zinc-500">{t.asset.assetTag}</div>
                  <div className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-50">
                    {t.asset.name}
                  </div>
                </Link>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {t.fromUser?.name ?? "—"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {t.toUser.name}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">
                  asked by {t.requestedBy.name} · {date(t.createDate)}
                </div>
              </TableCell>

              <TableCell className="max-w-xs">
                <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{t.reason}</p>
                {t.rejectReason && (
                  <p className="mt-0.5 truncate text-xs text-red-600 dark:text-red-400">
                    Rejected: {t.rejectReason}
                  </p>
                )}
              </TableCell>

              <TableCell>
                <Badge className={STATE_STYLE[t.state]}>{t.state}</Badge>
              </TableCell>

              {canApprove && (
                <TableCell>
                  {t.state === "pending" ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <form action={approveAction}>
                        <input type="hidden" name="transferId" value={t.id} />
                        <Button type="submit" size="sm" disabled={approving}>
                          Approve
                        </Button>
                      </form>

                      <form action={rejectAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="transferId" value={t.id} />
                        <Input
                          name="reason"
                          placeholder="Reason…"
                          className="h-8 w-32 text-xs"
                          disabled={rejecting}
                        />
                        <Button type="submit" variant="ghost" size="sm" disabled={rejecting}>
                          Reject
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <span className="block text-right text-xs text-zinc-400">Decided</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
