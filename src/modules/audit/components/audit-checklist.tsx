import type { AssetCondition, AuditResult } from "@prisma/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RESULT_LABEL, RESULT_BADGE } from "../audit.model";
import { MarkLineDialog } from "./mark-line-dialog";

type Line = {
  id: number;
  result: AuditResult;
  observedCondition: AssetCondition | null;
  observedLocation: string | null;
  notes: string | null;
  asset: { id: number; name: string; assetTag: string; location: string | null; condition: AssetCondition };
  auditor: { id: number; name: string } | null;
};

export function AuditChecklist({ lines, auditCycleId }: { lines: Line[]; auditCycleId: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>On-record location</TableHead>
          <TableHead>Result</TableHead>
          <TableHead>Marked by</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.id}>
            <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
              {line.asset.name} <span className="text-zinc-400">({line.asset.assetTag})</span>
            </TableCell>
            <TableCell>{line.asset.location ?? "—"}</TableCell>
            <TableCell>
              <Badge className={RESULT_BADGE[line.result]}>{RESULT_LABEL[line.result]}</Badge>
            </TableCell>
            <TableCell>{line.auditor?.name ?? "—"}</TableCell>
            <TableCell>
              <MarkLineDialog
                lineId={line.id}
                auditCycleId={auditCycleId}
                assetLabel={`${line.asset.assetTag} — ${line.asset.name}`}
                currentLocation={line.asset.location}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
