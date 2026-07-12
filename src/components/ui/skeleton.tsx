import type { CSSProperties } from "react";
import { cn } from "./utils";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  /** For heights that can't be expressed as a Tailwind class — chart bars, say. */
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse rounded bg-zinc-100 dark:bg-zinc-800", className)}
      style={style}
    />
  );
}

/**
 * Placeholder for a table that is still loading.
 *
 * Deliberately shaped like the table it replaces — same row height, same column
 * rhythm — so the content lands where the eye is already looking instead of
 * shoving it sideways. A generic spinner tells you *that* something is loading;
 * a skeleton tells you *what*.
 */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      <div className="flex gap-4 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn(
                  "h-4 flex-1",
                  // Vary the widths a little — a grid of identical bars reads as
                  // a loading *pattern*, not as content about to arrive.
                  c === 0 && "h-9",
                  c === cols - 1 && "max-w-20",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
