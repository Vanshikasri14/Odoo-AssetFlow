import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/** Bookings index: a grid of resource cards, then "my bookings". */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-52" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <Skeleton className="mb-4 h-5 w-32" />
        <TableSkeleton rows={4} cols={5} />
      </div>
    </div>
  );
}
