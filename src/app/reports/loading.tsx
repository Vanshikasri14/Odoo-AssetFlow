import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/** Reports: two charts, then tables, then the heatmap. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* The two charts. Bars of varying height read as a chart mid-load;
            a flat block reads as a broken image. */}
        {[0, 1].map((chart) => (
          <div key={chart} className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
            <Skeleton className="mb-2 h-5 w-48" />
            <Skeleton className="mb-5 h-3 w-72" />
            <div className="flex h-40 items-end gap-3">
              {[60, 85, 40, 95, 55, 70, 35].map((h, i) => (
                <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ))}

        {/* Four table cards. */}
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
            <Skeleton className="mb-2 h-5 w-40" />
            <Skeleton className="mb-4 h-3 w-64" />
            <TableSkeleton rows={5} cols={3} />
          </div>
        ))}
      </div>
    </div>
  );
}
