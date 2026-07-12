import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";
import { requireUser, can } from "@/lib/rbac";
import * as booking from "@/modules/booking/booking.service";
import { displayStatus, DISPLAY_STATUS_BADGE } from "@/modules/booking/booking.model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WeekCalendar } from "@/modules/booking/components/week-calendar";
import { NewBookingDialog } from "@/modules/booking/components/new-booking-dialog";
import { CancelBookingForm } from "@/modules/booking/components/cancel-booking-form";
import { RescheduleDialog } from "@/modules/booking/components/reschedule-dialog";

export default async function ResourceBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const { assetId: assetIdParam } = await params;
  const { week } = await searchParams;

  const assetId = Number(assetIdParam);
  if (!Number.isInteger(assetId)) notFound();

  const asset = await booking.getBookableAsset(assetId);
  if (!asset) notFound();

  const weekStart = startOfWeek(week ? new Date(week) : new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const bookings = await booking.listBookingsInRange(assetId, weekStart, weekEnd);

  const prevWeek = format(addWeeks(weekStart, -1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/bookings"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ← All resources
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {asset.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {asset.assetTag}
            {asset.location ? ` · ${asset.location}` : ""}
          </p>
        </div>
        <NewBookingDialog assetId={asset.id} assetName={asset.name} />
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/bookings/${assetId}?week=${prevWeek}`}>
          <Button variant="outline" size="icon" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <Link href={`/bookings/${assetId}?week=${nextWeek}`}>
          <Button variant="outline" size="icon" aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <WeekCalendar weekStart={weekStart} bookings={bookings} currentUser={user} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          This week&apos;s bookings
        </h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No bookings this week.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bookings.map((b) => {
              const status = displayStatus(b);
              const manageable =
                (b.userId === user.id || can.approve(user)) &&
                (status === "Upcoming" || status === "Ongoing");
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{b.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {b.user.name} · {format(b.startDatetime, "EEE MMM d, HH:mm")}–
                      {format(b.endDatetime, "HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={DISPLAY_STATUS_BADGE[status]}>{status}</Badge>
                    {manageable && (
                      <>
                        <RescheduleDialog
                          bookingId={b.id}
                          assetId={assetId}
                          startDatetime={b.startDatetime}
                          endDatetime={b.endDatetime}
                        />
                        <CancelBookingForm bookingId={b.id} assetId={assetId} />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
