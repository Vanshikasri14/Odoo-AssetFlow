import { Skeleton } from "@/components/ui/skeleton";

/** Asset detail: thumbnail + title on the left, facts panel, history timeline. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl">
      <Skeleton className="mb-4 h-4 w-28" />

      <header className="mb-6 flex items-start gap-4">
        <Skeleton className="h-16 w-16 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <Skeleton className="mb-4 h-5 w-20" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, card) => (
            <div key={card} className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
              <Skeleton className="mb-4 h-5 w-28" />
              <div className="space-y-4 border-l border-zinc-200 pl-5 dark:border-zinc-800">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
