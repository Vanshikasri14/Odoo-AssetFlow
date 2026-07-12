import type { Metadata } from "next";
import Link from "next/link";
import { requireRole, ORG_ADMINS } from "@/lib/rbac";
import { cn } from "@/components/ui/utils";
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

  // The tab lives in the URL rather than in React state. It survives a refresh,
  // it can be linked to, the back button behaves as expected — and the server
  // only queries for the tab actually being shown. (This is why these are <Link>s
  // styled like the design system's Tabs, rather than <Tabs> itself, which is
  // client-state.)
  //
  // Departments and employees are both needed by more than one tab (the
  // department form needs people for its Head selector), so they're fetched
  // unconditionally, in parallel.
  const [departments, employees, categories] = await Promise.all([
    listDepartments(),
    listEmployees(),
    active === "categories" ? listCategories() : Promise.resolve([]),
  ]);

  const activeDepartments = departments
    .filter((d) => d.active)
    .map((d) => ({ id: d.id, name: d.name }));
  const activePeople = employees.filter((e) => e.active).map((e) => ({ id: e.id, name: e.name }));

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

      <nav className="mb-6 inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/organization?tab=${t.key}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === t.key
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {active === "departments" && (
        <DepartmentTab departments={departments} people={activePeople} />
      )}

      {active === "categories" && <CategoryTab categories={categories} />}

      {active === "employees" && (
        <EmployeeTab employees={employees} departments={activeDepartments} meId={me.id} />
      )}
    </div>
  );
}
