import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";
import { can, requireUser } from "@/lib/rbac";
import {
  listAllocatableAssets,
  listAllocations,
  listHolders,
  listTransfers,
} from "@/modules/allocation/allocation.service";
import { searchAssets } from "@/modules/asset/asset.service";
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

export default async function AllocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await requireUser();
  const { tab } = await searchParams;
  const active: Tab = TABS.some((t) => t.key === tab) ? (tab as Tab) : "active";

  const canWrite = can.writeAssets(me);
  const canApprove = can.approve(me);

  const [transfers, overdue, holders, allocatable, everyAsset] = await Promise.all([
    listTransfers(),
    listAllocations("overdue"),
    listHolders(),
    listAllocatableAssets(),
    // The conflict path needs to be able to *pick* an already-held asset — that
    // is the whole point of the demo.
    canWrite ? searchAssets({ q: "" }) : Promise.resolve([]),
  ]);

  const rows =
    active === "transfers"
      ? []
      : active === "overdue"
        ? overdue
        : await listAllocations(active === "returned" ? "returned" : "active");

  const pendingCount = transfers.filter((t) => t.state === "pending").length;

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

      <nav className="mb-6 inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        {TABS.map((t) => {
          const count =
            t.key === "overdue" ? overdue.length : t.key === "transfers" ? pendingCount : 0;

          return (
            <Link
              key={t.key}
              href={`/allocations?tab=${t.key}`}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active === t.key
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200",
              )}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                    t.key === "overdue"
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "grid gap-6",
          canWrite && active !== "transfers" && "lg:grid-cols-[minmax(0,1fr)_380px]",
        )}
      >
        <Card>
          <CardHeader>
            <CardTitle>{TABS.find((t) => t.key === active)!.label}</CardTitle>
            {active === "overdue" && (
              <CardDescription>
                Past their expected return date. Derived live from the data — never a stale flag.
              </CardDescription>
            )}
            {active === "transfers" && (
              <CardDescription>
                Requested → Approved → Re-allocated. Approving closes the old custody row and opens
                a new one, atomically.
              </CardDescription>
            )}
          </CardHeader>

          <CardContent>
            {active === "transfers" ? (
              <TransferTable transfers={transfers} canApprove={canApprove} />
            ) : (
              <AllocationTable
                allocations={rows}
                scope={active === "returned" ? "returned" : active === "overdue" ? "overdue" : "active"}
                canReturn={canApprove}
              />
            )}
          </CardContent>
        </Card>

        {canWrite && active !== "transfers" && (
          <AllocateForm
            assets={allocatable}
            allAssets={everyAsset.map((a) => ({
              id: a.id,
              assetTag: a.assetTag,
              name: a.name,
            }))}
            users={holders.users}
            departments={holders.departments}
          />
        )}
      </div>
    </div>
  );
}
