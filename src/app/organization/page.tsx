import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { requireRole, ORG_ADMINS } from "@/lib/rbac";
import { listCategories, listDepartments, listEmployees } from "@/modules/hr/hr.service";
import { DepartmentTab } from "@/modules/hr/components/department-tab";
import { CategoryTab } from "@/modules/hr/components/category-tab";
import { EmployeeTab } from "@/modules/hr/components/employee-tab";

export const metadata: Metadata = { title: "Organization · AssetFlow" };

const TABS = [
  { key: "departments", label: "Departments" },
  { key: "categories", label: "Asset Categories" },
  { key: "employees", label: "Employee Directory" },
] as const;

type Tab = (typeof TABS)[number]["key"];

/**
 * Tab data, behind a Suspense boundary keyed on the tab — see the note in
 * app/allocations/page.tsx. Search-param changes don't trigger `loading.tsx`, so
 * without this the previous tab sits frozen while the next one loads.
 */
async function TabContent({ tab, meId }: { tab: Tab; meId: number }) {
  // Departments and employees are both needed by more than one tab (the
  // department form needs a people list for its Head selector), so they're
  // fetched together, in parallel.
  const [departments, employees, categories] = await Promise.all([
    listDepartments(),
    listEmployees(),
    tab === "categories" ? listCategories() : Promise.resolve([]),
  ]);

  const activeDepartments = departments
    .filter((d) => d.active)
    .map((d) => ({ id: d.id, name: d.name }));
  const activePeople = employees.filter((e) => e.active).map((e) => ({ id: e.id, name: e.name }));

  if (tab === "categories") return <CategoryTab categories={categories} />;
  if (tab === "employees") {
    return <EmployeeTab employees={employees} departments={activeDepartments} meId={meId} />;
  }
  return <DepartmentTab departments={departments} people={activePeople} />;
}

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Admin only. A non-admin who guesses this URL is redirected, not shown a
  // half-rendered page.
  const me = await requireRole(ORG_ADMINS);

  const { tab } = await searchParams;
  const active: Tab = TABS.some((t) => t.key === tab) ? (tab as Tab) : "departments";

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Organization setup
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The master data everything else depends on — departments, categories, and who works here.
        </p>
      </header>

      {/* The tab lives in the URL rather than React state: it survives a refresh,
          it can be linked to, and the back button behaves as people expect. */}
      <nav className="mb-6 flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 sm:inline-flex sm:w-auto dark:bg-zinc-900">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/organization?tab=${t.key}`}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
        <TabContent tab={active} meId={me.id} />
      </Suspense>
    </div>
  );
}
