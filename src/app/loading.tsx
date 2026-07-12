/**
 * Streaming fallback for every route.
 *
 * Without a `loading.tsx`, Next.js holds the old page on screen until *all* the
 * server data for the new one has resolved — so a click feels dead for however
 * long the slowest query takes. With one, the shell swaps instantly and the
 * content streams in behind it.
 *
 * The data doesn't arrive any sooner. But "instant, then fills in" and "frozen
 * for a second, then appears" are very different experiences of the same second,
 * and only one of them makes people click the button again.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 dark:bg-zinc-800 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 space-y-2">
        <Bar className="h-7 w-48" />
        <Bar className="h-4 w-72" />
      </div>

      {/* KPI-ish row — matches the densest page (dashboard), and reads as a
          generic "cards are coming" everywhere else. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bar key={i} className="h-24" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <Bar className="mb-4 h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Bar key={i} className="h-10" />
            ))}
          </div>
        </div>

        <div className="hidden rounded-lg border border-zinc-200 p-6 lg:block dark:border-zinc-800">
          <Bar className="mb-4 h-5 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Bar key={i} className="h-14" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
