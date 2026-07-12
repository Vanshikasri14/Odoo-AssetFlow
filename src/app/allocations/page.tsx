import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import type { SessionUser } from "@/lib/auth";
import { can, requireUser } from "@/lib/rbac";
import {
  listAllAssetsBrief,
  listAllocatableAssets,
  listAllocations,
  listHolders,
  listTransfers,
} from "@/modules/allocation/allocation.service";
import { AllocateForm } from "@/modules/allocation/components/allocate-form";
import { AllocationTable } from "@/modules/allocation/components/allocation-table";
import { TransferTable } from "@/modules/allocation/components/transfer-table";

export const metadata: Metadata = { title: "Allocations · AssetFlow" };

const TABS = [
  { key: "active", label: "Currently held" },
  { key: "overdue", label: "Overdue" },
  { key: "transfers", label: "Transfers" },
  { key: "returned", label: "Returned" },
] as const;

type Tab = (typeof TABS)[number]["key"];

/**
 * The tab's data — fetched inside a Suspense boundary, not in the page.
 *
 * Switching tabs changes a SEARCH PARAM, not a route. Next does not re-run
 * `loading.tsx` for search-param changes, so the old table just sat there,
 * frozen, until the new data arrived — which on a database ~80ms away is long
 * enough to look broken.
 *
 * Wrapping this in `<Suspense key={tab}>` gives every tab its own boundary: the
 * key changes, the boundary remounts, the skeleton appears immediately, and the
 * real table streams in behind it. The data doesn't arrive any sooner — but the
 * click now visibly does something, which is the whole complaint.
 */
async function TabContent({ tab, me }: { tab: Tab; me: SessionUser }) {
  const canWrite = can.writeAssets(me);
  const canApprove = can.approve(me);

  const [transfers, overdue, holders, allocatable, everyAsset, tabRows] = await Promise.all([
    listTransfers(),
    listAllocations("overdue"),
    listHolders(),
    listAllocatableAssets(),
    canWrite ? listAllAssetsBrief() : Promise.resolve([]),
    tab === "transfers" || tab === "overdue"
      ? Promise.resolve([])
      : listAllocations(tab === "returned" ? "returned" : "active"),
  ]);

  const rows = tab === "transfers" ? [] : tab === "overdue" ? overdue : tabRows;

  return (
    <div
      className={cn(
        "grid gap-6",
        canWrite && tab !== "transfers" && "lg:grid-cols-[minmax(0,1fr)_380px]",
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle>{TABS.find((t) => t.key === tab)!.label}</CardTitle>
          {tab === "overdue" && (
            <CardDescription>
              Past their expected return date. Derived live from the data — never a stale flag.
            </CardDescription>
          )}
          {tab === "transfers" && (
            <CardDescription>
              Requested → Approved → Re-allocated. Approving closes the old custody row and opens a
              new one, atomically.
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {tab === "transfers" ? (
            <TransferTable transfers={transfers} canApprove={canApprove} />
          ) : (
            <AllocationTable
              allocations={rows}
              scope={tab === "returned" ? "returned" : tab === "overdue" ? "overdue" : "active"}
              canReturn={canApprove}
            />
          )}
        </CardContent>
      </Card>

      {canWrite && tab !== "transfers" && (
        <AllocateForm
          assets={allocatable}
          allAssets={everyAsset}
          users={holders.users}
          departments={holders.departments}
        />
      )}
    </div>
  );
}

export default async function AllocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await requireUser();
  const { tab } = await searchParams;
  const active: Tab = TABS.some((t) => t.key === tab) ? (tab as Tab) : "active";

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Allocations
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Who holds what — and every hand it has passed through.
        </p>
      </header>

      {/* The tab bar needs no data, so it paints instantly and stays put — the
          clicked tab highlights straight away while the content streams below. */}
      <nav className="mb-6 flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 sm:inline-flex sm:w-auto dark:bg-zinc-900">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/allocations?tab=${t.key}`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === t.key
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <Suspense
        key={active}
        fallback={
          <Card>
            <CardContent className="p-6">
              <TableSkeleton rows={6} cols={5} />
            </CardContent>
          </Card>
        }
      >
        <TabContent tab={active} me={me} />
      </Suspense>
    </div>
  );
}
