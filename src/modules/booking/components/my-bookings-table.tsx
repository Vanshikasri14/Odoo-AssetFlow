import { CalendarClock } from "lucide-react";
import type { BookingState } from "@prisma/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { displayStatus, DISPLAY_STATUS_BADGE } from "../booking.model";
import { CancelBookingForm } from "./cancel-booking-form";

type Row = {
  id: number;
  name: string;
  startDatetime: Date;
  endDatetime: Date;
  state: BookingState;
  asset: { id: number; name: string; assetTag: string };
};

export function MyBookingsTable({ bookings }: { bookings: Row[] }) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No bookings yet"
        description="Book a resource above to see it here."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resource</TableHead>
          <TableHead>Purpose</TableHead>
          <TableHead>When</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => {
          const status = displayStatus(b);
          const canCancel = status === "Upcoming" || status === "Ongoing";
          return (
            <TableRow key={b.id}>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                {b.asset.name} <span className="text-zinc-400">({b.asset.assetTag})</span>
              </TableCell>
              <TableCell>{b.name}</TableCell>
              <TableCell>
                {b.startDatetime.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" – "}
                {b.endDatetime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </TableCell>
              <TableCell>
                <Badge className={DISPLAY_STATUS_BADGE[status]}>{status}</Badge>
              </TableCell>
              <TableCell>
                {canCancel && <CancelBookingForm bookingId={b.id} assetId={b.asset.id} />}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
