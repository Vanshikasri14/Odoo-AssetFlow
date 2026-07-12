import type { Metadata } from "next";
import Link from "next/link";
import { Plus, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/components/ui/utils";
import { can, requireUser } from "@/lib/rbac";
import { BADGE, LABEL } from "@/modules/asset/lifecycle";
import { assetFilterSchema } from "@/modules/asset/asset.schema";
import { getFilterOptions, searchAssets } from "@/modules/asset/asset.service";
import { AssetFilters } from "@/modules/asset/components/asset-filters";
import { AssetThumb } from "@/modules/asset/components/asset-thumb";

export const metadata: Metadata = { title: "Assets · AssetFlow" };

function money(n: unknown) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireUser();
  const raw = await searchParams;

  // Unparseable filters are ignored rather than fatal — a hand-edited URL should
  // degrade to "no filter", not a 500.
  const parsed = assetFilterSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : { q: "" };

  const [assets, options] = await Promise.all([searchAssets(filters), getFilterOptions()]);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Assets
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {assets.length} asset{assets.length === 1 ? "" : "s"}
            {parsed.success && Object.keys(raw).length > 0 ? " matching your filters" : " on record"}.
          </p>
        </div>

        {/* Only Asset Managers and Admins can register. Employees still SEE the
            registry — they need to look assets up — they just can't add to it. */}
        {can.writeAssets(me) && (
          <Link href="/assets/new" className={cn(buttonVariants(), "shrink-0")}>
            <Plus className="h-4 w-4" />
            Register asset
          </Link>
        )}
      </header>

      <Card className="mb-4">
        <CardContent className="p-4">
          <AssetFilters options={options} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {assets.length === 0 ? (
            <EmptyState
              title="No assets match"
              description="Try clearing a filter, or search by asset tag or serial number."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Held by</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => {
                  const holding = a.allocations[0];
                  const holder = holding?.holderUser?.name ?? holding?.holderDept?.name ?? null;
                  const overdue =
                    holding?.expectedReturnDate != null &&
                    holding.expectedReturnDate < new Date();

                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link
                          href={`/assets/${a.id}`}
                          className="font-mono text-xs font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
                        >
                          {a.assetTag}
                        </Link>
                      </TableCell>

                      <TableCell>
                        <Link href={`/assets/${a.id}`} className="group flex items-center gap-3">
                          <AssetThumb
                            name={a.name}
                            category={a.category.name}
                            imageUrl={a.imageUrl}
                            size={38}
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-medium text-zinc-900 group-hover:underline dark:text-zinc-50">
                              {a.name}
                              {a.isBookable && (
                                <CalendarClock
                                  className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                                  aria-label="Bookable resource"
                                />
                              )}
                            </span>
                            {a.serialNo && (
                              <span className="block font-mono text-xs text-zinc-400">
                                {a.serialNo}
                              </span>
                            )}
                          </span>
                        </Link>
                      </TableCell>

                      <TableCell>{a.category.name}</TableCell>

                      <TableCell>
                        <Badge className={BADGE[a.state]}>{LABEL[a.state]}</Badge>
                      </TableCell>

                      <TableCell>
                        {holder ? (
                          <div>
                            <div className="text-zinc-900 dark:text-zinc-50">{holder}</div>
                            {overdue && (
                              <div className="text-xs font-medium text-red-600 dark:text-red-400">
                                Overdue
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="text-zinc-500 dark:text-zinc-400">
                        {a.location ?? "—"}
                      </TableCell>

                      <TableCell className="text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                        {money(a.acquisitionCost)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
