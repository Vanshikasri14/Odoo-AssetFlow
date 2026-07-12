import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for a resource's booking calendar.
 *
 * Route-specific rather than falling back to the root `loading.tsx`, which is
 * shaped like a KPI dashboard — six stat cards flashing up over what is about to
 * become a week grid reads as a glitch, not as loading. A skeleton earns its
 * keep only when it's the shape of the thing arriving.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl">
      <Skeleton className="mb-4 h-4 w-32" />

      <div className="mb-6">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* The week grid: an hour gutter, then seven day columns. */}
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>

          <div className="grid gap-px" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={`h${i}`} className="h-6" />
            ))}

            {Array.from({ length: 8 }).map((_, row) => (
              <div key={row} className="contents">
                <Skeleton className="h-10 w-10" />
                {Array.from({ length: 7 }).map((_, col) => (
                  <Skeleton
                    key={col}
                    // A few filled slots, so it reads as "a calendar with
                    // bookings in it" rather than an empty grid.
                    className={`h-10 ${(row + col) % 5 === 0 ? "opacity-100" : "opacity-40"}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* The booking form. */}
        <div className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
