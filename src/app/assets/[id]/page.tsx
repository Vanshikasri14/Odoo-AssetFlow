import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CalendarClock, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/ui/utils";
import { can, requireUser } from "@/lib/rbac";
import { BADGE, LABEL } from "@/modules/asset/lifecycle";
import { CONDITION_LABEL } from "@/modules/asset/asset.schema";
import { getAsset, getAssetHistory } from "@/modules/asset/asset.service";

export const metadata: Metadata = { title: "Asset · AssetFlow" };

function date(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d));
}

function dateTime(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(d),
  );
}

function money(n: unknown) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const assetId = Number(id);
  if (!Number.isInteger(assetId)) notFound();

  const [asset, history] = await Promise.all([getAsset(assetId), getAssetHistory(assetId)]);
  if (!asset) notFound();

  const current = asset.allocations.find((a) => a.returnedDate === null);
  const holder = current?.holderUser?.name ?? current?.holderDept?.name ?? null;
  const overdue =
    current?.expectedReturnDate != null && current.expectedReturnDate < new Date();

  const facts: [string, React.ReactNode][] = [
    ["Category", asset.category.name],
    ["Serial number", asset.serialNo ?? "—"],
    ["Condition", CONDITION_LABEL[asset.condition]],
    ["Location", asset.location ?? "—"],
    ["Owning department", asset.department?.name ?? "—"],
    ["Acquired", date(asset.acquisitionDate)],
    ["Acquisition cost", money(asset.acquisitionCost)],
    [
      "Warranty",
      asset.category.warrantyMonths
        ? `${asset.category.warrantyMonths} months from acquisition`
        : "—",
    ],
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/assets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to assets
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <code className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {asset.assetTag}
            </code>
            <Badge className={BADGE[asset.state]}>{LABEL[asset.state]}</Badge>
            {asset.isBookable && (
              <Badge variant="outline">
                <CalendarClock className="h-3 w-3" />
                Bookable
              </Badge>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {asset.name}
          </h1>
          {holder && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Held by <span className="font-medium text-zinc-700 dark:text-zinc-300">{holder}</span>
              {current?.expectedReturnDate && (
                <>
                  {" · "}
                  <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                    {overdue ? "Overdue since" : "Due back"} {date(current.expectedReturnDate)}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {can.writeAssets(me) && (
          <Link
            href={`/assets/${asset.id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2 text-sm">
                    <dt className="text-zinc-500 dark:text-zinc-400">{k}</dt>
                    <dd className="text-right font-medium text-zinc-900 dark:text-zinc-50">{v}</dd>
                  </div>
                ))}
              </dl>
              {asset.notes && (
                <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  {asset.notes}
                </p>
              )}
            </CardContent>
          </Card>

          {asset.isBookable && asset.bookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming bookings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {asset.bookings.map((b) => (
                  <div key={b.id} className="text-sm">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{b.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {dateTime(b.startDatetime)} — {b.user.name}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/*
            The brief asks for "allocation history + maintenance history" per
            asset. Because every state change in the system writes to mail_message
            inside the same transaction, both of those — plus registration, plus
            audits once Dev B ships them — come out of ONE query, and new event
            types appear here automatically without this page being touched.
          */}
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <EmptyState title="Nothing yet" description="Events will appear here." />
              ) : (
                <ol className="relative space-y-4 border-l border-zinc-200 pl-5 dark:border-zinc-800">
                  {history.map((m) => (
                    <li key={m.id} className="relative">
                      <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-zinc-300 ring-4 ring-white dark:bg-zinc-600 dark:ring-zinc-950" />
                      <p className="text-sm text-zinc-900 dark:text-zinc-50">{m.body}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {m.author?.name ?? "System"} · {dateTime(m.createDate)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allocation history</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.allocations.length === 0 ? (
                <EmptyState title="Never allocated" description="This asset has not been issued." />
              ) : (
                <div className="space-y-3">
                  {asset.allocations.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-100 pb-3 text-sm last:border-0 last:pb-0 dark:border-zinc-800"
                    >
                      <div>
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {a.holderUser?.name ?? a.holderDept?.name}
                        </span>
                        <span className="ml-2 text-xs text-zinc-400">
                          issued by {a.allocatedBy.name}
                        </span>
                        {a.checkinNotes && (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            “{a.checkinNotes}”
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                        {date(a.allocatedDate)} →{" "}
                        {a.returnedDate ? (
                          date(a.returnedDate)
                        ) : (
                          <Badge className={BADGE.allocated}>Current</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance history</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.maintenance.length === 0 ? (
                <EmptyState title="No maintenance" description="This asset has never been repaired." />
              ) : (
                <div className="space-y-3">
                  {asset.maintenance.map((m) => (
                    <div
                      key={m.id}
                      className="border-b border-zinc-100 pb-3 text-sm last:border-0 last:pb-0 dark:border-zinc-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{m.name}</span>
                        <Badge variant="secondary">{m.state.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="mt-1 text-zinc-500 dark:text-zinc-400">{m.description}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Raised by {m.requestedBy.name} · {date(m.createDate)}
                        {m.technician && ` · Technician: ${m.technician.name}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
