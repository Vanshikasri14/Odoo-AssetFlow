import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/** Audit cycle: header, then the asset checklist. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl">
      <Skeleton className="mb-4 h-4 w-28" />

      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-96" />
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <Skeleton className="mb-4 h-5 w-32" />
        <TableSkeleton rows={8} cols={4} />
      </div>
    </div>
  );
}
