"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { cn } from "@/components/ui/utils";
import { readAll, readOne } from "../notification.actions";

type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createDate: Date;
};

/** Notifications that mean "someone is waiting on you" get an amber dot. */
const URGENT: NotificationType[] = [
  "transfer_requested",
  "maintenance_requested",
  "overdue_return",
  "audit_discrepancy",
];

function relative(d: Date) {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function NotificationBell({
  notifications,
  unread,
}: {
  notifications: Notification[];
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function open_(n: Notification) {
    start(async () => {
      if (!n.isRead) await readOne(n.id);
      setOpen(false);
      if (n.actionUrl) router.push(n.actionUrl);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        className="relative rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-medium tabular-nums text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away. A full modal would be overkill for a dropdown. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Notifications
              </p>
              {unread > 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(async () => { await readAll(); })}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-200"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-zinc-400">
                  Nothing to catch up on.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => open_(n)}
                        disabled={pending}
                        className={cn(
                          "flex w-full gap-2.5 px-4 py-3 text-left transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900",
                          !n.isRead && "bg-blue-50/40 dark:bg-blue-950/20",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            n.isRead
                              ? "bg-transparent"
                              : URGENT.includes(n.type)
                                ? "bg-amber-500"
                                : "bg-blue-500",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-sm",
                                n.isRead
                                  ? "text-zinc-600 dark:text-zinc-400"
                                  : "font-medium text-zinc-900 dark:text-zinc-50",
                              )}
                            >
                              {n.title}
                            </span>
                            <span className="shrink-0 text-xs text-zinc-400">
                              {relative(n.createDate)}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {n.body}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="block border-t border-zinc-100 px-4 py-2.5 text-center text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              View full activity log
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
