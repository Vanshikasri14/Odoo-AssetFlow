import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/ui/utils";
import { requireUser } from "@/lib/rbac";
import { listNotifications } from "@/modules/core/notification.service";
import { readAll } from "@/modules/core/notification.actions";

export const metadata: Metadata = { title: "Notifications · AssetFlow" };

/**
 * The mockup's filter chips. Each maps to a group of notification types, because
 * "Approvals" is a thing a person cares about and `transfer_requested` is not.
 */
const GROUPS = {
  all: null,
  alerts: ["overdue_return", "audit_discrepancy"],
  approvals: [
    "transfer_requested",
    "transfer_approved",
    "transfer_rejected",
    "maintenance_requested",
    "maintenance_approved",
    "maintenance_rejected",
  ],
  bookings: ["booking_confirmed", "booking_cancelled", "booking_reminder"],
} satisfies Record<string, NotificationType[] | null>;

type Group = keyof typeof GROUPS;

const CHIPS: { key: Group; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alerts", label: "Alerts" },
  { key: "approvals", label: "Approvals" },
  { key: "bookings", label: "Bookings" },
];

/** Alerts are red, approvals amber, everything else blue. Colour = urgency. */
function dotColour(type: NotificationType) {
  if ((GROUPS.alerts as readonly string[]).includes(type)) return "bg-red-500";
  if ((GROUPS.approvals as readonly string[]).includes(type)) return "bg-amber-500";
  return "bg-blue-500";
}

function relative(d: Date) {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const me = await requireUser();
  const { filter } = await searchParams;

  const active: Group = filter && filter in GROUPS ? (filter as Group) : "all";

  const all = await listNotifications(me.id, 100);

  const types = GROUPS[active];
  const shown = types === null ? all : all.filter((n) => (types as readonly string[]).includes(n.type));

  const unread = all.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {unread > 0
              ? `${unread} unread — everything that needs your attention.`
              : "You're all caught up."}
          </p>
        </div>

        {unread > 0 && (
          <form action={readAll}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          </form>
        )}
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CHIPS.map((c) => {
          const count =
            GROUPS[c.key] === null
              ? all.length
              : all.filter((n) => (GROUPS[c.key] as readonly string[]).includes(n.type)).length;

          return (
            <Link
              key={c.key}
              href={c.key === "all" ? "/notifications" : `/notifications?filter=${c.key}`}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                active === c.key
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400",
              )}
            >
              {c.label}
              <span className="tabular-nums opacity-60">{count}</span>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className={shown.length === 0 ? "p-0" : "p-0"}>
          {shown.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nothing here"
              description={
                active === "all"
                  ? "Notifications will appear as things happen."
                  : "No notifications in this category."
              }
            />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {shown.map((n) => {
                const body = (
                  <div
                    className={cn(
                      "flex gap-3 px-5 py-4 transition-colors",
                      !n.isRead && "bg-blue-50/40 dark:bg-blue-950/20",
                      n.actionUrl && "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        n.isRead ? "bg-zinc-200 dark:bg-zinc-700" : dotColour(n.type),
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p
                          className={cn(
                            "text-sm",
                            n.isRead
                              ? "text-zinc-600 dark:text-zinc-400"
                              : "font-medium text-zinc-900 dark:text-zinc-50",
                          )}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-xs text-zinc-400">
                          {relative(n.createDate)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{n.body}</p>
                    </div>
                  </div>
                );

                return (
                  <li key={n.id}>
                    {n.actionUrl ? <Link href={n.actionUrl}>{body}</Link> : body}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="mt-3 text-center text-xs text-zinc-400">
        Looking for the full audit trail?{" "}
        <Link href="/activity" className="underline underline-offset-2 hover:text-zinc-600">
          Activity log
        </Link>
      </p>
    </div>
  );
}
