import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Clock,
  PackageCheck,
  Plus,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/ui/utils";
import { can, requireUser, ROLE_LABEL } from "@/lib/rbac";
import {
  getMyKpis,
  getOrgKpis,
  getPendingApprovals,
  getRecentActivity,
  getReturns,
  getTodaysBookings,
} from "@/modules/analytics/dashboard.service";
import { KpiCard } from "@/modules/analytics/components/kpi-card";

export const metadata: Metadata = { title: "Dashboard · AssetFlow" };

function date(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d));
}
function time(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(d));
}
function daysLate(due: Date) {
  return Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000);
}
function relative(d: Date) {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function DashboardPage() {
  const me = await requireUser();

  // Managers see the organisation; everyone else sees their own desk. Same page,
  // same components — what changes is the SCOPE of the query, not the layout.
  const orgView = can.viewAllAnalytics(me);

  const [kpis, returns, bookings, approvals, activity] = await Promise.all([
    orgView ? getOrgKpis() : getMyKpis(me.id),
    getReturns(me),
    getTodaysBookings(me),
    getPendingApprovals(me),
    orgView ? getRecentActivity() : Promise.resolve([]),
  ]);

  const approvalCount = approvals.transfers.length + approvals.maintenance.length;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {orgView ? "Dashboard" : `Hello, ${me.name.split(" ")[0]}`}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {orgView
              ? `Organisation-wide · ${ROLE_LABEL[me.role]}`
              : "Everything currently assigned to you."}
          </p>
        </div>

        {/* Quick actions, per the brief. Role-filtered — we don't offer an
            Employee a Register Asset button that will only bounce them. */}
        <div className="flex flex-wrap gap-2">
          {can.writeAssets(me) && (
            <Link href="/assets/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="h-4 w-4" />
              Register asset
            </Link>
          )}
          <Link href="/bookings" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <CalendarClock className="h-4 w-4" />
            Book resource
          </Link>
          <Link href="/maintenance" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Wrench className="h-4 w-4" />
            Raise maintenance
          </Link>
        </div>
      </header>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {orgView ? (
          <>
            <KpiCard
              label="Assets available"
              value={kpis.assetsAvailable}
              icon={PackageCheck}
              href="/assets?state=available"
              hint={`of ${kpis.totalAssets} total`}
            />
            <KpiCard
              label="Assets allocated"
              value={kpis.assetsAllocated}
              icon={Boxes}
              href="/assets?state=allocated"
            />
            <KpiCard
              label="Under maintenance"
              value={kpis.underMaintenance}
              icon={Wrench}
              href="/maintenance"
              hint={
                kpis.pendingMaintenance > 0
                  ? `${kpis.pendingMaintenance} awaiting approval`
                  : undefined
              }
            />
            <KpiCard
              label="Active bookings"
              value={kpis.activeBookings}
              icon={CalendarClock}
              href="/bookings"
            />
            <KpiCard
              label="Pending transfers"
              value={kpis.pendingTransfers}
              icon={ArrowLeftRight}
              href="/allocations?tab=transfers"
              tone="alert"
            />
            <KpiCard
              label="Overdue returns"
              value={kpis.overdueReturns}
              icon={AlertTriangle}
              href="/allocations?tab=overdue"
              tone="alert"
              hint={`${kpis.upcomingReturns} due this week`}
            />
          </>
        ) : (
          <>
            <KpiCard
              label="Assets you hold"
              value={kpis.assetsAllocated}
              icon={Boxes}
              href="/allocations"
            />
            <KpiCard
              label="Your bookings"
              value={kpis.activeBookings}
              icon={CalendarClock}
              href="/bookings"
            />
            <KpiCard
              label="Your maintenance"
              value={kpis.maintenanceToday}
              icon={Wrench}
              href="/maintenance"
            />
            <KpiCard
              label="Due back this week"
              value={kpis.upcomingReturns}
              icon={Clock}
              href="/allocations"
            />
            <KpiCard
              label="Transfers involving you"
              value={kpis.pendingTransfers}
              icon={ArrowLeftRight}
              href="/allocations?tab=transfers"
            />
            <KpiCard
              label="Overdue"
              value={kpis.overdueReturns}
              icon={AlertTriangle}
              tone="alert"
              href="/allocations?tab=overdue"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/*
            ⭐ The brief: "Overdue returns (past Expected Return Date) highlighted
            SEPARATELY from upcoming ones." Two distinct cards, not one list with
            a red row buried in it — the entire point is that overdue items need
            action today and upcoming ones don't.
          */}
          <Card className={returns.overdue.length > 0 ? "border-red-200 dark:border-red-900" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {returns.overdue.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                Overdue returns
                {returns.overdue.length > 0 && (
                  <Badge variant="destructive">{returns.overdue.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Past their expected return date. Someone needs to chase these.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {returns.overdue.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nothing is overdue"
                  description="Every asset that's out is still within its expected return date."
                />
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {returns.overdue.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link
                          href={`/assets/${a.asset.id}`}
                          className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                        >
                          {a.asset.name}
                        </Link>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{a.asset.assetTag}</span> ·{" "}
                          {a.holderUser?.name ?? a.holderDept?.name} · due {date(a.expectedReturnDate)}
                        </p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {daysLate(a.expectedReturnDate!)} days late
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming returns</CardTitle>
              <CardDescription>Due back within the next seven days.</CardDescription>
            </CardHeader>
            <CardContent>
              {returns.upcoming.length === 0 ? (
                <EmptyState title="Nothing due this week" />
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {returns.upcoming.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link
                          href={`/assets/${a.asset.id}`}
                          className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                        >
                          {a.asset.name}
                        </Link>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{a.asset.assetTag}</span> ·{" "}
                          {a.holderUser?.name ?? a.holderDept?.name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {date(a.expectedReturnDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {orgView && (
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Every state change in the system, as it happens.</CardDescription>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <EmptyState title="Nothing yet" />
                ) : (
                  <ul className="space-y-2.5">
                    {activity.map((m) => (
                      <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">{m.body}</span>
                        <span className="shrink-0 text-xs text-zinc-400">
                          {m.author?.name ?? "System"} · {relative(m.createDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {can.approve(me) && (
            <Card className={approvalCount > 0 ? "border-amber-300 dark:border-amber-800" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Waiting on you
                  {approvalCount > 0 && <Badge variant="secondary">{approvalCount}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvalCount === 0 ? (
                  <EmptyState icon={CheckCircle2} title="All clear" description="No approvals pending." />
                ) : (
                  <>
                    {approvals.transfers.map((t) => (
                      <Link
                        key={`t${t.id}`}
                        href="/allocations?tab=transfers"
                        className="block rounded-md border border-zinc-200 p-3 text-sm transition-colors hover:border-zinc-300 dark:border-zinc-800"
                      >
                        <div className="flex items-center gap-1.5">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">Transfer</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{t.asset.assetTag}</span> ·{" "}
                          {t.fromUser?.name ?? "—"} → {t.toUser.name}
                        </p>
                      </Link>
                    ))}

                    {approvals.maintenance.map((m) => (
                      <Link
                        key={`m${m.id}`}
                        href="/maintenance"
                        className="block rounded-md border border-zinc-200 p-3 text-sm transition-colors hover:border-zinc-300 dark:border-zinc-800"
                      >
                        <div className="flex items-center gap-1.5">
                          <Wrench className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            Maintenance
                          </span>
                          <Badge variant="secondary" className="ml-auto">
                            {m.priority}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{m.asset.assetTag}</span> · {m.requestedBy.name}
                        </p>
                      </Link>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <EmptyState title="Nothing booked today" />
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {bookings.map((b) => (
                    <li key={b.id} className="flex items-baseline justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {b.asset.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {b.name} · {b.user.name}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {time(b.startDatetime)}–{time(b.endDatetime)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
