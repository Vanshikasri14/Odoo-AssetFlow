import { requireUser } from "@/lib/rbac";
import * as booking from "@/modules/booking/booking.service";
import { BookableResourceList } from "@/modules/booking/components/bookable-resource-list";
import { MyBookingsTable } from "@/modules/booking/components/my-bookings-table";

export default async function BookingsPage() {
  const user = await requireUser();
  const [assets, myBookings] = await Promise.all([
    booking.listBookableAssets(),
    booking.listMyBookings(user.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Resource Booking</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Book a shared resource by time slot — overlapping bookings are rejected.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Bookable resources
        </h2>
        <BookableResourceList assets={assets} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          My bookings
        </h2>
        <MyBookingsTable bookings={myBookings} />
      </section>
    </div>
  );
}
