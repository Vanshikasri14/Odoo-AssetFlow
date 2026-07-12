import { Skeleton } from "@/components/ui/skeleton";

/** The kanban: five columns of cards. */
export default function Loading() {
  // Uneven column heights, because a real board is never balanced — most cards
  // pile up in Pending.
  const COLUMN_CARDS = [3, 1, 2, 1, 2];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {COLUMN_CARDS.map((cards, col) => (
          <div key={col} className="flex flex-col">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-5 rounded-full" />
            </div>

            <div className="flex min-h-24 flex-1 flex-col gap-2 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900/50">
              {Array.from({ length: cards }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
