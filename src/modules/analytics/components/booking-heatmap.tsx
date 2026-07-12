import type { HeatCell } from "../reports.service";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00 → 19:00

/**
 * Booking heatmap — peak usage windows.
 *
 * A CSS grid, not a charting library. Five colour steps, not a continuous ramp:
 * the eye cannot reliably compare shades on a gradient, and the question this
 * answers ("when are the rooms full?") only needs "busy / not busy" resolution.
 *
 * Intensity is scaled against the busiest cell rather than an absolute number,
 * so the map stays readable whether the org books 5 times a week or 500.
 */
export function BookingHeatmap({ cells }: { cells: HeatCell[] }) {
  const lookup = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.bookings]));
  const peak = Math.max(1, ...cells.map((c) => c.bookings));

  function shade(count: number) {
    if (count === 0) return "bg-zinc-50 dark:bg-zinc-900";
    const ratio = count / peak;
    if (ratio > 0.75) return "bg-blue-600 text-white";
    if (ratio > 0.5) return "bg-blue-500 text-white";
    if (ratio > 0.25) return "bg-blue-300 dark:bg-blue-800 dark:text-blue-100";
    return "bg-blue-100 dark:bg-blue-950 dark:text-blue-300";
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Hour labels */}
        <div className="mb-1 flex gap-1 pl-10">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-zinc-400">
              {h}
            </div>
          ))}
        </div>

        {DAYS.map((day, dow) => (
          <div key={day} className="mb-1 flex items-center gap-1">
            <div className="w-9 shrink-0 text-right text-[11px] text-zinc-500 dark:text-zinc-400">
              {day}
            </div>
            {HOURS.map((hour) => {
              const count = lookup.get(`${dow}-${hour}`) ?? 0;
              return (
                <div
                  key={hour}
                  title={`${day} ${hour}:00 — ${count} booking${count === 1 ? "" : "s"}`}
                  className={`flex h-7 flex-1 items-center justify-center rounded text-[10px] font-medium tabular-nums ${shade(count)}`}
                >
                  {count > 0 ? count : ""}
                </div>
              );
            })}
          </div>
        ))}

        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-zinc-400">
          <span>Quiet</span>
          <span className="h-3 w-5 rounded bg-zinc-50 dark:bg-zinc-900" />
          <span className="h-3 w-5 rounded bg-blue-100 dark:bg-blue-950" />
          <span className="h-3 w-5 rounded bg-blue-300 dark:bg-blue-800" />
          <span className="h-3 w-5 rounded bg-blue-500" />
          <span className="h-3 w-5 rounded bg-blue-600" />
          <span>Busy ({peak})</span>
        </div>
      </div>
    </div>
  );
}
