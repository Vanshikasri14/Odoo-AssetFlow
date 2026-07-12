import type { Metadata } from "next";
import Link from "next/link";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/components/ui/utils";
import { requireRole } from "@/lib/rbac";
import { BADGE, LABEL } from "@/modules/asset/lifecycle";
import type { AssetState } from "@prisma/client";
import {
  getAgeingAssets,
  getBookingHeatmap,
  getDepartmentSummary,
  getMaintenanceByCategory,
  getProblemAssets,
  getUtilisation,
} from "@/modules/analytics/reports.service";
import { BookingHeatmap } from "@/modules/analytics/components/booking-heatmap";

export const metadata: Metadata = { title: "Reports · AssetFlow" };

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: n >= 100_000 ? "compact" : "standard",
  }).format(n);
}

function ExportButton({ report, label }: { report: string; label: string }) {
  return (
    <a
      href={`/api/reports/${report}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      download
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export default async function ReportsPage() {
  // Managers and Admins. An Employee has no business seeing the whole register's
  // value, or which departments are running late.
  await requireRole(["admin", "asset_manager"]);

  const [utilisation, maintenance, problems, ageing, departments, heatmap] = await Promise.all([
    getUtilisation(),
    getMaintenanceByCategory(),
    getProblemAssets(),
    getAgeingAssets(),
    getDepartmentSummary(),
    getBookingHeatmap(),
  ]);

  const mostUsed = utilisation.filter((u) => u.times_allocated > 0).slice(0, 8);

  // "Idle" means: never allocated, or not touched in over 90 days. Dead stock is
  // the thing an asset manager actually wants this page to surface.
  const idle = utilisation
    .filter((u) => u.times_allocated === 0 || (u.days_idle !== null && u.days_idle > 90))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Reports
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Everything below is computed live from the source tables — no rollups, no stale caches.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton report="utilisation" label="Utilisation CSV" />
          <ExportButton report="departments" label="Departments CSV" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Most used ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Most-used assets
            </CardTitle>
            <CardDescription>
              By days actually held, not just number of loans — an asset lent twenty times for an
              hour isn&apos;t busier than one lent once for a year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mostUsed.length === 0 ? (
              <EmptyState title="Nothing has been allocated yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Loans</TableHead>
                    <TableHead className="text-right">Days held</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mostUsed.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link href={`/assets/${u.id}`} className="group">
                          <div className="font-mono text-xs text-zinc-500">{u.asset_tag}</div>
                          <div className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-50">
                            {u.name}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.times_allocated}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {u.days_held}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Idle ──────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Idle assets
            </CardTitle>
            <CardDescription>
              Never allocated, or untouched for over 90 days. This is the dead stock — capital
              sitting in a cupboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {idle.length === 0 ? (
              <EmptyState title="Nothing is idle" description="Every asset is in use." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Idle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {idle.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link href={`/assets/${u.id}`} className="group">
                          <div className="font-mono text-xs text-zinc-500">{u.asset_tag}</div>
                          <div className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-50">
                            {u.name}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={BADGE[u.state as AssetState]}>
                          {LABEL[u.state as AssetState]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-zinc-500">
                        {u.times_allocated === 0 ? "Never used" : `${u.days_idle}d`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Maintenance frequency ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Maintenance by category</CardTitle>
              <CardDescription>Where the repair burden actually falls.</CardDescription>
            </div>
            <ExportButton report="maintenance" label="CSV" />
          </CardHeader>
          <CardContent>
            {maintenance.length === 0 ? (
              <EmptyState title="No maintenance recorded" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Assets</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Avg fix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance.map((m) => (
                    <TableRow key={m.category}>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                        {m.category}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.requests}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.assets_affected}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.total_cost > 0 ? money(m.total_cost) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-500">
                        {m.avg_days_to_resolve != null
                          ? `${m.avg_days_to_resolve.toFixed(1)}d`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {problems.length > 0 && (
              <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Repeat offenders — worth replacing rather than repairing
                </p>
                <ul className="space-y-1.5">
                  {problems.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link
                        href={`/assets/${p.id}`}
                        className="truncate text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        <span className="font-mono text-xs text-zinc-400">{p.asset_tag}</span>{" "}
                        {p.name}
                      </Link>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {p.requests}× · {p.total_cost > 0 ? money(p.total_cost) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Department summary ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Department allocation summary</CardTitle>
              <CardDescription>Who owns what, and who&apos;s running late.</CardDescription>
            </div>
            <ExportButton report="departments" label="CSV" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Owned</TableHead>
                  <TableHead className="text-right">Out</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                      {d.department}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{d.owned}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.currently_held}</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-500">
                      {d.total_value > 0 ? money(d.total_value) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.overdue > 0 ? (
                        <Badge variant="destructive">{d.overdue}</Badge>
                      ) : (
                        <span className="tabular-nums text-zinc-400">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Heatmap ───────────────────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resource booking heatmap</CardTitle>
            <CardDescription>
              Peak usage windows. A 09:00–12:00 booking lights up three cells, not one — counting
              only start times would make long meetings look short.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {heatmap.length === 0 ? (
              <EmptyState title="No bookings yet" />
            ) : (
              <BookingHeatmap cells={heatmap} />
            )}
          </CardContent>
        </Card>

        {/* ── Ageing ────────────────────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Nearing end of life</CardTitle>
              <CardDescription>
                Oldest assets still in service. &ldquo;Out of warranty&rdquo; is a heuristic — past
                the category&apos;s warranty window — not a formal retirement policy.
              </CardDescription>
            </div>
            <ExportButton report="ageing" label="CSV" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Age</TableHead>
                  <TableHead>Warranty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ageing.slice(0, 10).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/assets/${a.id}`} className="group">
                        <div className="font-mono text-xs text-zinc-500">{a.asset_tag}</div>
                        <div className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-50">
                          {a.name}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>
                      <Badge className={BADGE[a.state as AssetState]}>
                        {LABEL[a.state as AssetState]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.age_years} yrs</TableCell>
                    <TableCell>
                      {a.warranty_months == null ? (
                        <span className="text-zinc-400">—</span>
                      ) : a.out_of_warranty ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="secondary">In warranty</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
