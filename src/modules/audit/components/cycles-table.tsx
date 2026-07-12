import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import type { AuditCycleState } from "@prisma/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CYCLE_STATE_LABEL, CYCLE_STATE_BADGE } from "../audit.model";

type Row = {
  id: number;
  name: string;
  state: AuditCycleState;
  dateStart: Date;
  dateEnd: Date;
  scopeDepartment: { id: number; name: string } | null;
  scopeLocation: string | null;
  _count: { lines: number; auditors: number };
};

export function CyclesTable({ cycles }: { cycles: Row[] }) {
  if (cycles.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No audit cycles yet"
        description="Create one above to start an asset audit."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Auditors</TableHead>
          <TableHead>Assets</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cycles.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
              <Link href={`/audits/${c.id}`} className="hover:underline">
                {c.name}
              </Link>
            </TableCell>
            <TableCell>
              {c.scopeDepartment?.name ?? c.scopeLocation ?? "Whole organisation"}
            </TableCell>
            <TableCell>
              {c.dateStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
              {c.dateEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </TableCell>
            <TableCell>
              <Badge className={CYCLE_STATE_BADGE[c.state]}>{CYCLE_STATE_LABEL[c.state]}</Badge>
            </TableCell>
            <TableCell>{c._count.auditors}</TableCell>
            <TableCell>{c._count.lines}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
