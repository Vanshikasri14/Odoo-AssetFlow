import { addDays, format, isSameDay } from "date-fns";
import type { UserRole } from "@prisma/client";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const HOUR_PX = 48;
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;

type BookingRow = {
  id: number;
  name: string;
  startDatetime: Date;
  endDatetime: Date;
  state: string;
  userId: number;
  user: { id: number; name: string };
};

function minutesFromDayStart(d: Date): number {
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}

/**
 * A CSS-grid week view — plain on purpose, per the brief's warning not to
 * lose an hour to a heavyweight calendar library. Bookings for one resource
 * can never overlap (that's the whole point of the screen), so blocks never
 * need side-by-side stacking within a day.
 */
export function WeekCalendar({
  weekStart,
  bookings,
  currentUser,
}: {
  weekStart: Date;
  bookings: BookingRow[];
  currentUser: { id: number; role: UserRole };
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="grid min-w-[720px]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-b border-r border-zinc-200 dark:border-zinc-800" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="border-b border-r border-zinc-200 px-2 py-2 text-center text-xs font-medium text-zinc-500 last:border-r-0 dark:border-zinc-800 dark:text-zinc-400"
          >
            <div>{format(day, "EEE")}</div>
            <div className="text-zinc-900 dark:text-zinc-50">{format(day, "MMM d")}</div>
          </div>
        ))}

        <div
          className="relative border-r border-zinc-200 dark:border-zinc-800"
          style={{ height: GRID_HEIGHT }}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1 -translate-y-1/2 text-[11px] text-zinc-400"
              style={{ top: (h - DAY_START_HOUR) * HOUR_PX }}
            >
              {format(new Date(2000, 0, 1, h), "ha")}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayBookings = bookings.filter(
            (b) => isSameDay(b.startDatetime, day) && b.state === "confirmed",
          );
          return (
            <div
              key={day.toISOString()}
              className="relative border-r border-zinc-100 last:border-r-0 dark:border-zinc-900"
              style={{ height: GRID_HEIGHT }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-zinc-100 dark:border-zinc-900"
                  style={{ top: (h - DAY_START_HOUR) * HOUR_PX }}
                />
              ))}

              {dayBookings.map((b) => {
                const startMin = Math.max(0, minutesFromDayStart(b.startDatetime));
                const rawEndMin = minutesFromDayStart(b.endDatetime);
                const endMin = Math.min(TOTAL_MINUTES, rawEndMin <= 0 ? TOTAL_MINUTES : rawEndMin);
                const topPx = (startMin / 60) * HOUR_PX;
                const heightPx = Math.max(20, ((endMin - startMin) / 60) * HOUR_PX);
                const mine = b.userId === currentUser.id;

                return (
                  <div
                    key={b.id}
                    className={`absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-[11px] leading-tight shadow-sm ${
                      mine
                        ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
                        : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                    style={{ top: topPx, height: heightPx }}
                  >
                    <p className="truncate font-medium">{b.name}</p>
                    <p className="truncate">{b.user.name}</p>
                    <p>
                      {format(b.startDatetime, "HH:mm")}–{format(b.endDatetime, "HH:mm")}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
