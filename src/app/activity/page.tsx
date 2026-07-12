import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { can, requireUser } from "@/lib/rbac";
import {
  getActivityFilterOptions,
  listActivity,
  type ActivityFilters as Filters,
} from "@/modules/core/notification.service";
import {
  ActivityFilters,
  MODEL_LABEL,
} from "@/modules/core/components/activity-filters";

export const metadata: Metadata = { title: "Activity · AssetFlow" };

/** Verbs that changed something meaningful get a colour; the rest stay quiet. */
const ACTION_STYLE: Record<string, string> = {
  allocate: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-500/30",
  return: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  approve_transfer: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  reject_transfer: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
  approve_maintenance: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  promote: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
};

function stamp(d: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date(d));
}

/** The record a log line refers to, so every entry is clickable. */
function hrefFor(model: string, resId: number): string | null {
  switch (model) {
    case "asset.asset":
      return `/assets/${resId}`;
    case "maintenance.request":
      return "/maintenance";
    case "resource.booking":
      return "/bookings";
    case "audit.cycle":
      return `/audits/${resId}`;
    case "hr.department":
    case "asset.category":
    case "res.users":
      return "/organization";
    default:
      return null;
  }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await requireUser();
  const sp = await searchParams;

  const filters: Filters = {
    model: sp.model,
    action: sp.action,
    actor: sp.actor ? Number(sp.actor) : undefined,
    q: sp.q,
  };

  const [entries, options] = await Promise.all([
    listActivity(me, filters),
    getActivityFilterOptions(me),
  ]);

  const orgView = can.viewAllAnalytics(me);

  // Group by day. A flat list of 100 timestamps is unreadable; the day heading
  // is what makes it scannable.
  const byDay = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = dayKey(e.createDate);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Activity log
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {orgView
            ? "Who did what, and when — every state change in the system."
            : "Everything you have done."}
        </p>
      </header>

      {orgView && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <ActivityFilters
              actors={options.actors}
              models={options.models}
              actions={options.actions}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className={entries.length === 0 ? "p-0" : "p-6"}>
          {entries.length === 0 ? (
            <EmptyState
              title="Nothing here"
              description="No activity matches those filters."
            />
          ) : (
            <div className="space-y-6">
              {[...byDay.entries()].map(([day, items]) => (
                <section key={day}>
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {day}
                  </h2>

                  <ol className="relative space-y-3 border-l border-zinc-200 pl-5 dark:border-zinc-800">
                    {items.map((e) => {
                      const href = hrefFor(e.model, e.resId);

                      return (
                        <li key={e.id} className="relative">
                          <span className="absolute -left-[23px] top-2 h-2 w-2 rounded-full bg-zinc-300 ring-4 ring-white dark:bg-zinc-600 dark:ring-zinc-950" />

                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <Badge
                              variant="secondary"
                              className={ACTION_STYLE[e.action]}
                            >
                              {e.action.replace(/_/g, " ")}
                            </Badge>

                            {href ? (
                              <Link
                                href={href}
                                className="text-sm text-zinc-900 hover:underline dark:text-zinc-50"
                              >
                                {e.body}
                              </Link>
                            ) : (
                              <span className="text-sm text-zinc-900 dark:text-zinc-50">
                                {e.body}
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-xs text-zinc-400">
                            {e.author?.name ?? "System"} ·{" "}
                            {MODEL_LABEL[e.model] ?? e.model} · {stamp(e.createDate)}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {entries.length >= 100 && (
        <p className="mt-3 text-center text-xs text-zinc-400">
          Showing the 100 most recent entries. Filter to narrow it down.
        </p>
      )}
    </div>
  );
}
