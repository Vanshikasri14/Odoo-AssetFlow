import { ShieldAlert } from "lucide-react";
import type { AuditResult } from "@prisma/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RESULT_LABEL, RESULT_BADGE } from "../audit.model";

type Line = {
  id: number;
  result: AuditResult;
  notes: string | null;
  asset: { id: number; name: string; assetTag: string };
  auditor: { id: number; name: string } | null;
};

export function DiscrepancyReport({ lines }: { lines: Line[] }) {
  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No discrepancies"
        description="Every asset in scope was verified — nothing missing or damaged."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Result</TableHead>
          <TableHead>Auditor</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.id}>
            <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
              {line.asset.name} <span className="text-zinc-400">({line.asset.assetTag})</span>
            </TableCell>
            <TableCell>
              <Badge className={RESULT_BADGE[line.result]}>{RESULT_LABEL[line.result]}</Badge>
            </TableCell>
            <TableCell>{line.auditor?.name ?? "—"}</TableCell>
            <TableCell>{line.notes ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
